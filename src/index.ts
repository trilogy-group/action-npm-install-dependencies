import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as stream from 'stream'
import * as util from 'util'
import * as path from 'path'
import { Octokit } from '@octokit/rest'
import { createActionAuth } from "@octokit/auth-action"

async function run() {
  const allPackageLocksGlob = await glob.create('**/package-lock.json')
  const allPackageLocks = [...await allPackageLocksGlob.glob()]

  const cacheKey = [
  	'npm',
  	process.env.ImageOS || 'unknown',
  	process.env.ImageVersion || 'unknown',
  	await hashFiles(allPackageLocks)
  ].join('-')

  // do this statically for consistency and speed
  //const cachePaths = [ '**/node_modules' ];
  const cachePaths = allPackageLocks.map(packageLock =>
  	path.relative(path.dirname(packageLock), 'node_modules'));

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const hasCiAll = packageJson.scripts && packageJson.scripts['ci-all']

  const restoredCacheKey = await cache.restoreCache(cachePaths, cacheKey);
  if (restoredCacheKey) {
      core.info('Dependencies restored from cache')
      return
  }

  const octokit = new Octokit({ authStrategy: createActionAuth })
  const githubUser = await octokit.rest.users.getAuthenticated()
  core.info(`Running as ${githubUser.data.login}`)

  core.info('Configure npm')
  await exec.exec('env')
  await exec.exec('echo $GITHUB_TOKEN')
  await exec.exec('echo $GITHUB_TOKEN | base64')
  await exec.exec('npm config set @trilogy-group:registry https://npm.pkg.github.com/')
  await exec.exec('npm config set //npm.pkg.github.com/:_authToken $GITHUB_TOKEN')

  core.info('Install dependencies')
  if (hasCiAll) {
    await exec.exec('npm run ci-all')
  } else {
    await exec.exec('npm ci')
  }

  core.info('Merge duplicate files')
  await exec.exec('sudo DEBIAN_FRONTEND=noninteractive apt-get install -qq -o=Dpkg::Use-Pty=0 rdfind')
  await exec.exec('rdfind -makehardlinks true .')

  try {
      await cache.saveCache(cachePaths, cacheKey)
      core.info('Dependencies saved to cache')
  } catch (error) {
      if (error.name === cache.ValidationError.name) {
          throw error
      } else if (error.name === cache.ReserveCacheError.name) {
          core.info(error.message)
      } else {
          core.info(`[warning]${error.message}`)
      }
  }
}

// Function not yet exposed, see https://github.com/actions/toolkit/issues/472
// Based on https://github.com/actions/runner/blob/master/src/Misc/expressionFunc/hashFiles/src/hashFiles.ts
async function hashFiles(files: string[]) {
  const result = crypto.createHash('sha256')
  for (const file of files) {
    const hash = crypto.createHash('sha256')
    const pipeline = util.promisify(stream.pipeline)
    await pipeline(fs.createReadStream(file), hash)
    result.write(hash.digest())
  }
  result.end()
  return result.digest('hex')
}

(async () => {
  try {
    await run()
  } catch (error) {
    core.info(`[warning]${error.message}`)
    process.exitCode = 1
  }
})()


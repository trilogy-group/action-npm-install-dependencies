import * as cache from "@actions/cache"
import * as core from "@actions/core"
import * as glob from '@actions/glob'
const exec = require('@actions/exec');

const allPackageLocksGlob = await glob.create('**/package-lock.json')
const allPackageLocks = [...await allPackageLocksGlob.glob()]

const key = [
	'npm',
	process.env.ImageOS ?? 'unknown',
	process.env.ImageVersion ?? 'unknown',
	hashFiles(allPackageLocks)
].join('-')

// do this statically for consistency and speed
//const cachePaths = [ '**/node_modules' ];
const cachePaths = allPackageLocks.map(packageLock =>
	path.relative(path.dirname(packageLock), 'node_modules'));

const restoredCacheKey = await cache.restoreCache(cachePaths, cacheKey);
if (restoredCacheKey) {
    core.info('Dependencies restored from cache');
    return;
}

core.info('Configuring npm');
await exec.exec(`
npm config set @trilogy-group:registry https://npm.pkg.github.com/
npm config set '//npm.pkg.github.com/:_authToken' $GITHUB_TOKEN
`);

core.info('Installing dependencies');
await exec.exec('npm run ci-all');

core.info('De-duplicating dependencies');
await exec.exec(`
sudo DEBIAN_FRONTEND=noninteractive apt-get install -qq rdfind
rdfind -makehardlinks true .
`);

try {
    await cache.saveCache(cachePaths, cacheKey);
    core.info('Dependencies saved to cache');
} catch (error) {
    if (error.name === cache.ValidationError.name) {
        throw error;
    } else if (error.name === cache.ReserveCacheError.name) {
        core.info(error.message);
    } else {
        utils.logWarning(error.message);
    }
}

// Function not yet exposed, see https://github.com/actions/toolkit/issues/472
// Based on https://github.com/actions/runner/blob/master/src/Misc/expressionFunc/hashFiles/src/hashFiles.ts
hashFiles(files) {
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

This action wraps action/cache to install your npm dependencies in an optimised way.

It differs from directly using action/cache & npm ci in the following ways:
* We cache post-installation (node_modules) rather than pre-installation (~/.npm), to skip post-install script processing
* We always use the image version in the key, so native code is safe
* We de-duplicate files in the cache to save on download time
* We save immediately after installing, to be insultated from build issues (e.g. creating spurious node_modules directories)

To use it, add the following to your GitHub workflow steps:
```
uses: trilogy-group/action-npm-install-dependencies@v1
```

If you want to use a different token to access repositories, you can do this:
```
uses: trilogy-group/action-npm-install-dependencies@v1
env:
  GITHUB_TOKEN: ${{ secrets.ENG_STD_TOKEN }}
```

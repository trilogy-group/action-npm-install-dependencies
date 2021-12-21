#!/bin/bash
set -e

# create build
git branch -c work-without-apt staging
git switch staging
npm run build

# commit and tag package files
git add -f dist/index.js
git commit -m Release

# replace the tag
git tag -d dummy || true
git push --delete origin dummy || true
git tag dummy
git push --tags origin dummy

# restore
git switch work-without-apt
git branch -D staging

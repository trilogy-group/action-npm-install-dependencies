#!/bin/bash
set -e

# create build
git branch -c main staging
git switch staging
npm run build

# commit and tag package files
git add -f dist/index.js
git commit -m Release

# replace the tag
git tag -d debug || true
git push --delete origin debug || true
git tag debug
git push --tags origin debug

# restore
git switch main
git branch -D staging

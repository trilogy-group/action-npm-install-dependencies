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
git tag -d v1 || true
git push --delete origin v1 || true
git tag v1
git push --tags origin v1

# restore
git switch main
git branch -D staging

#!/bin/bash
set -e

# create build
git branch -c main staging
git switch staging
npm run build

# commit and tag package files
git add -f dist/index.js
git add -f template
git commit -m Release

# replace the tag
git tag -d latest || true
git push --delete origin latest || true
git tag latest
git push --tags origin latest

# restore
git switch main
git branch -D staging

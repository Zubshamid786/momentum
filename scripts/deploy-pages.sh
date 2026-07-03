#!/bin/bash
# deploy-pages.sh — build the web app and publish dist/ to the gh-pages branch.
# Run from the project root:  bash scripts/deploy-pages.sh
set -euo pipefail

echo "▸ Building…"
npx vite build

echo "▸ Publishing dist/ → gh-pages…"
cd dist
rm -rf .git
git init --quiet
git checkout -b gh-pages --quiet
touch .nojekyll                      # serve files starting with _ etc. verbatim
git add .
git -c user.name="Zubshamid786" -c user.email="zubshamid786@gmail.com" \
  commit -m "deploy $(date '+%Y-%m-%d %H:%M')" --quiet
git push --force https://github.com/Zubshamid786/momentum.git gh-pages --quiet
cd ..
rm -rf dist/.git

echo "✓ Deployed — live at https://zubshamid786.github.io/momentum/ (may take ~1 min)"

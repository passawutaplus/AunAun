#!/usr/bin/env bash
# One-time setup for Puppeteer E2E on Linux/WSL (Chrome binary + shared libraries).
# Run on your machine (needs sudo):
#   bash scripts/e2e-puppeteer/install-chrome-deps.sh
set -euo pipefail

echo "==> Installing Chrome runtime libraries (Debian/Ubuntu/WSL)..."
sudo apt-get update
sudo apt-get install -y \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
  libcairo2 libcups2t64 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libglib2.0-0t64 \
  libgtk-3-0t64 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libx11-6 libx11-xcb1 \
  libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 unzip wget xdg-utils || \
sudo apt-get install -y \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libglib2.0-0 \
  libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libx11-6 libx11-xcb1 \
  libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 unzip wget xdg-utils

echo "==> Installing Chrome via @puppeteer/browsers (needs unzip)..."
cd "$(dirname "$0")/../../"
npx @puppeteer/browsers install chrome@stable

echo "==> Done. Run: npm run e2e:puppeteer:smoke"

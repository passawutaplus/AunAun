#!/usr/bin/env bash
# Automated test gate — Solo + Anthem unit tests + public curl smoke + ecosystem health.
# Usage:
#   ./scripts/test-ecosystem.sh
#   SOLO_BASE_URL=https://solofreelancer.com ANTHEM_BASE_URL=https://aplus1-demo.vercel.app ./scripts/test-ecosystem.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOLO_BASE="${SOLO_BASE_URL:-https://solofreelancer.com}"
ANTHEM_BASE="${ANTHEM_BASE_URL:-https://aplus1-demo.vercel.app}"
export SMOKE_SKIP_SITEMAP_CONTENT="${SMOKE_SKIP_SITEMAP_CONTENT:-1}"

echo "========== Solo-Code =========="
cd "$ROOT/Solo-Code"
npm run test
BASE_URL="$SOLO_BASE" SMOKE_SKIP_SITEMAP_CONTENT=1 npm run smoke:public

echo ""
echo "========== Solo-Code SEO dev smoke (local SSR) =========="
bash "$ROOT/scripts/solo-smoke-seo-build.sh"

echo ""
echo "========== Anthem-Code =========="
cd "$ROOT/Anthem-Code"
npm run test
BASE_URL="$ANTHEM_BASE" npm run smoke:public

echo ""
echo "========== Vault-Code =========="
cd "$ROOT/Vault-Code"
npm run test:gate
BASE_URL="${VAULT_BASE_URL:-https://aplus-vault.vercel.app}" npm run smoke:public

echo ""
echo "========== Ecosystem health =========="
cd "$ROOT"
SO1O_URL="$SOLO_BASE" ANTHEM_URL="$ANTHEM_BASE" HUB_URL="${HUB_URL:-skip}" bash scripts/health-check.sh

echo ""
echo "==> Ecosystem automated gate PASSED"

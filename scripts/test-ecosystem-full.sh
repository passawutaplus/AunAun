#!/usr/bin/env bash
# Full QA automated gate — base tests + security + perf + tokens + cron + RLS + puppeteer + optional admin crawl.
#
# Usage:
#   ./scripts/test-ecosystem-full.sh
#   FULL_LIGHTHOUSE=1 ./scripts/test-ecosystem-full.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_PATH="${ROOT}/Solo-Code/node_modules:${ROOT}/Anthem-Code/node_modules"
export SMOKE_SKIP_SITEMAP_CONTENT="${SMOKE_SKIP_SITEMAP_CONTENT:-1}"

FAIL=0

step() {
  echo ""
  echo "########################################"
  echo "# $1"
  echo "########################################"
  if "$2"; then
    echo ">>> $1 PASSED"
  else
    echo ">>> $1 FAILED"
    FAIL=1
  fi
}

step "Base gate (unit + curl smoke + health)" bash scripts/test-ecosystem.sh
step "Security smoke" node scripts/qa/security-smoke.mjs
step "Performance timing" node scripts/qa/performance-timing.mjs
step "Invalid token pages" node scripts/qa/invalid-token.mjs
step "Cron auth smoke" node scripts/qa/cron-smoke.mjs
step "RLS smoke" node scripts/qa/rls-smoke.mjs

if [[ -f Solo-Code/package.json ]] && grep -q '"stripe:verify"' Solo-Code/package.json 2>/dev/null; then
  HAS_STRIPE=$(node -e "import {loadProjectEnv} from './scripts/qa/load-env.mjs'; loadProjectEnv(); process.stdout.write(process.env.STRIPE_SANDBOX_API_KEY||process.env.STRIPE_LIVE_API_KEY?'1':'0')")
  if [[ "$HAS_STRIPE" == "1" ]]; then
    step "Stripe catalog verify" bash -c "cd Solo-Code && npm run stripe:verify"
  else
    echo "SKIP Stripe verify — no STRIPE_*_API_KEY in env"
  fi
fi

step "Puppeteer gate" bash scripts/qa/puppeteer-gate.sh
step "Admin crawl" node scripts/qa/admin-crawl.mjs

if [[ "${FULL_LIGHTHOUSE:-}" == "1" ]]; then
  step "Lighthouse performance + SEO (slow)" node scripts/performance/run-performance.mjs
fi

echo ""
if [[ "$FAIL" -ne 0 ]]; then
  echo "=========================================="
  echo "==> FULL QA GATE FAILED"
  echo "=========================================="
  exit 1
fi

echo "=========================================="
echo "==> FULL QA GATE PASSED"
echo "=========================================="

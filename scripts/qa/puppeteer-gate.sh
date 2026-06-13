#!/usr/bin/env bash
# Run Puppeteer suites for Solo + Anthem (smoke + anthem chat + optional auth).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOLO_BASE="${SOLO_BASE_URL:-https://solofreelancer.com}"
ANTHEM_BASE="${ANTHEM_BASE_URL:-https://1px-demo.vercel.app}"
export NODE_PATH="${ROOT}/Solo-Code/node_modules:${ROOT}/Anthem-Code/node_modules"
FAIL=0

run_puppeteer() {
  local dir="$1"
  local suite="$2"
  local label="$3"
  local base="$4"
  echo "--- $label (suite=$suite) ---"
  if (cd "$ROOT/$dir" && E2E_BASE_URL="$base" E2E_SUITE="$suite" npm run e2e:puppeteer); then
    echo "OK   $label"
  else
    echo "FAIL $label"
    FAIL=1
  fi
}

if ! node -e "import { resolveChromePath } from './scripts/qa/chrome.mjs'; if (!resolveChromePath()) process.exit(2);" 2>/dev/null; then
  echo "SKIP Puppeteer gate — no Chrome (bash Solo-Code/scripts/e2e-puppeteer/install-chrome-deps.sh)"
  exit 0
fi

echo "==> Puppeteer gate"
run_puppeteer "Solo-Code" "smoke" "Solo smoke" "$SOLO_BASE"
run_puppeteer "Anthem-Code" "smoke" "Anthem smoke" "$ANTHEM_BASE"
run_puppeteer "Anthem-Code" "chat" "Anthem chat demo" "$ANTHEM_BASE"

HAS_AUTH=$(node -e "
import { loadProjectEnv, hasE2EUser, hasE2EAdmin } from './scripts/qa/load-env.mjs';
loadProjectEnv();
process.stdout.write(hasE2EUser() && hasE2EAdmin() ? '1' : '0');
")

if [[ "$HAS_AUTH" == "1" ]]; then
  run_puppeteer "Solo-Code" "auth" "Solo auth" "$SOLO_BASE"
  run_puppeteer "Anthem-Code" "auth" "Anthem auth" "$ANTHEM_BASE"
else
  echo "SKIP auth puppeteer — set E2E_USER_* and E2E_ADMIN_* in .env.local"
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "==> Puppeteer gate FAILED"
  exit 1
fi
echo "==> Puppeteer gate PASSED"

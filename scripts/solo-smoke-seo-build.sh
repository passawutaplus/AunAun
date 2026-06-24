#!/usr/bin/env bash
# Run full SEO smoke against a local Solo-Code SSR dev server.
# Validates sitemap/robots/llms content without depending on production deploy lag.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${SOLO_SMOKE_PORT:-4173}"
BASE="http://127.0.0.1:${PORT}"

cd "$ROOT/Solo-Code"

echo "==> Starting Solo-Code dev server on ${BASE}"
npm run dev -- --port "$PORT" --host 127.0.0.1 &
pid=$!
cleanup() { kill "$pid" 2>/dev/null || true; }
trap cleanup EXIT

ready=0
for _ in $(seq 1 90); do
  if curl -sf "${BASE}/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" -ne 1 ]]; then
  echo "FAIL dev server did not become ready on ${BASE}"
  exit 1
fi

BASE_URL="$BASE" bash scripts/smoke-public.sh
echo "==> Solo SEO dev smoke PASSED"

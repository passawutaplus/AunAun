#!/usr/bin/env bash
# Probe ecosystem URLs + Supabase REST. Exit 1 if any check fails.
set -euo pipefail

SO1O_URL="${SO1O_URL:-https://www.solofreelancer.com}"
ANTHEM_URL="${ANTHEM_URL:-https://an1hem.app}"
HUB_URL="${HUB_URL:-https://so1o-ops-hub.vercel.app}"
SUPABASE_URL="${SUPABASE_URL:-https://zkflkpbmbozrchqncpzi.supabase.co}"
TIMEOUT="${TIMEOUT:-10}"

fail=0

check_http() {
  local name="$1"
  local url="$2"
  if [[ "$url" == "skip" ]]; then
    echo "SKIP $name"
    return
  fi
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -L "$url" || echo "000")
  if [[ "$code" =~ ^[23] ]]; then
    echo "OK   $name ($code) $url"
  else
    echo "FAIL $name ($code) $url"
    fail=1
  fi
}

check_supabase() {
  local url="${SUPABASE_URL%/}/rest/v1/"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")
  # Supabase REST returns 401 without apikey — still means API is up
  if [[ "$code" =~ ^(200|401)$ ]]; then
    echo "OK   Supabase REST ($code) $url"
  else
    echo "FAIL Supabase REST ($code) $url"
    fail=1
  fi
}

echo "=== Ecosystem health $(date -Iseconds) ==="
check_http "So1o" "$SO1O_URL"
check_http "an1hem" "$ANTHEM_URL"
check_http "Ops Hub" "$HUB_URL"
check_supabase
echo "=========================================="

exit "$fail"

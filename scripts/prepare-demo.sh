#!/usr/bin/env bash
# One-shot: Auth URLs + ops migration + demo seed (run from dev machine with SUPABASE_ACCESS_TOKEN).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/Solo-Code/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/Solo-Code/.env" && set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ใน Solo-Code/.env"
  exit 1
fi

export SITE_URL="${SITE_URL:-https://solofreelancer.com}"
export SO1O_SITE_URL="${SO1O_SITE_URL:-$SITE_URL}"
export ANTHEM_SITE_URL="${ANTHEM_SITE_URL:-https://an1hem.app}"

echo "=== 1/3 Supabase Auth redirect URLs ==="
"$ROOT/scripts/setup-demo-auth.sh"

echo ""
echo "=== 2/3 Ops Hub schema (ops.*) ==="
node "$ROOT/scripts/apply-ops-schema.mjs" || echo "⚠  ops schema skipped"
node "$ROOT/Ops-Hub/scripts/expose-ops-schema.mjs" 2>/dev/null || echo "⚠  expose ops schema skipped"

echo ""
echo "=== 3/3 Demo seed (20 creators, full activity) ==="
cd "$ROOT/Anthem-Code"
npm run seed:demo-full

echo ""
echo "✓ Demo environment prepared"
echo "  ส่ง reviewer: docs/demo-pack.md"

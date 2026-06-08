#!/usr/bin/env bash
# Copy Supabase + app URLs from Solo-Code/.env into Ops-Hub/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOLO_ENV="$ROOT/Solo-Code/.env"
OUT="$ROOT/Ops-Hub/.env"

if [[ ! -f "$SOLO_ENV" ]]; then
  echo "⚠  ไม่พบ $SOLO_ENV — คัดลอกจาก .env.example แทน"
  cp "$ROOT/Ops-Hub/.env.example" "$OUT"
  exit 0
fi

get() { grep -E "^${1}=" "$SOLO_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true; }

SUPABASE_URL="$(get VITE_SUPABASE_URL)"
SUPABASE_KEY="$(get VITE_SUPABASE_PUBLISHABLE_KEY)"
PROJECT_ID="$(get VITE_SUPABASE_PROJECT_ID)"
SO1O_URL="$(get VITE_SITE_URL)"
[[ -z "$SO1O_URL" ]] && SO1O_URL="$(get VITE_SO1O_APP_URL)"
[[ -z "$SO1O_URL" ]] && SO1O_URL="https://www.solofreelancer.com"
ANTHEM_URL="$(get VITE_ANTHEM_APP_URL)"
[[ -z "$ANTHEM_URL" ]] && ANTHEM_URL="https://an1hem.app"

cat > "$OUT" <<EOF
# Auto-synced from Solo-Code/.env — $(date -Iseconds)
VITE_SUPABASE_URL=${SUPABASE_URL:-https://rvnzjiskqliexysicfmh.supabase.co}
VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_KEY}
VITE_SUPABASE_PROJECT_ID=${PROJECT_ID:-rvnzjiskqliexysicfmh}
VITE_SITE_URL=https://hq.solofreelancer.com
VITE_SO1O_APP_URL=${SO1O_URL}
VITE_ANTHEM_APP_URL=${ANTHEM_URL}
EOF

echo "✓ Wrote $OUT"

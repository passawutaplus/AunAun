#!/usr/bin/env bash
# Patch Supabase Auth redirect URLs for production demo links.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/Solo-Code/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/Solo-Code/.env" && set +a
fi

export SITE_URL="${SITE_URL:-https://solofreelancer.com}"
export SO1O_SITE_URL="${SO1O_SITE_URL:-$SITE_URL}"
export ANTHEM_SITE_URL="${ANTHEM_SITE_URL:-https://pixel100.com}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  SUPABASE_ACCESS_TOKEN ไม่พบ — ตั้งใน Solo-Code/.env"
  exit 1
fi

cd "$ROOT/Solo-Code"

PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}"
payload="$(python3 -c "
import json, os
urls = [
  'http://localhost:5173/**', 'http://localhost:8080/**', 'http://localhost:3000/**',
  'http://localhost:8081/**', 'http://127.0.0.1:5173/**', 'http://127.0.0.1:8080/**',
  'http://127.0.0.1:3000/**', 'http://127.0.0.1:8081/**',
  'https://solofreelancer.com/**', 'https://www.solofreelancer.com/**',
  os.environ.get('ANTHEM_SITE_URL', 'https://pixel100.com') + '/**',
  'https://www.pixel100.com/**',
  'https://www.an1hem.app/**', 'https://so1o-ops-hub.vercel.app/**',
  'http://localhost:3090/**', 'http://127.0.0.1:3090/**',
  'https://1px-demo.vercel.app/**', 'https://solo-demo-liart.vercel.app/**',
  'https://*.vercel.app/**',
]
print(json.dumps({
  'site_url': os.environ.get('SITE_URL') or os.environ.get('SO1O_SITE_URL', 'https://solofreelancer.com'),
  'uri_allow_list': ','.join(urls),
}))
" SITE_URL="$SITE_URL" ANTHEM_SITE_URL="$ANTHEM_SITE_URL")"

http_code="$(curl -s -o /tmp/supabase-auth-patch.json -w "%{http_code}" \
  -X PATCH "${API}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload")"

if [[ "$http_code" == "200" ]]; then
  echo "✓ Auth redirect URLs patched"
else
  echo "⚠  Auth PATCH failed (${http_code})"
  head -c 300 /tmp/supabase-auth-patch.json 2>/dev/null || true
fi

echo "✓ Auth URLs สำหรับ:"
echo "   $SO1O_SITE_URL"
echo "   $ANTHEM_SITE_URL"
echo "   https://hq.solofreelancer.com"

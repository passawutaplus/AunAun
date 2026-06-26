#!/usr/bin/env bash
# Push migrations via Supabase Management API (no DB password needed)
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-zkflkpbmbozrchqncpzi}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f "${HOME}/.config/supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(<"${HOME}/.config/supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ก่อน"
  echo "   export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens"
  echo "   หรือรัน: npx supabase login"
  exit 1
fi

apply_migration() {
  local file="$1"
  local name
  name="$(basename "$file" .sql)"
  echo "→ $name"

  local payload
  payload="$(python3 -c "
import json, pathlib, sys
sql = pathlib.Path(sys.argv[1]).read_text()
print(json.dumps({'query': sql, 'name': sys.argv[2]}))
" "$file" "$name")"

  local http_code body
  body="$(mktemp)"
  http_code="$(curl -s -o "$body" -w "%{http_code}" \
    -X POST "${API}/database/migrations" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload")"

  if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
    echo "✗ Failed ($http_code): $name"
    head -c 500 "$body"
    echo ""
    rm -f "$body"
    exit 1
  fi
  rm -f "$body"
}

echo "→ Fetching applied migrations..."
query_body="$(mktemp)"
query_code="$(curl -s -o "$query_body" -w "%{http_code}" \
  -X POST "${API}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT name FROM supabase_migrations.schema_migrations;"}')"

if [[ "$query_code" != "200" && "$query_code" != "201" ]]; then
  echo "✗ Failed to list migrations ($query_code)"
  head -c 500 "$query_body"
  echo ""
  rm -f "$query_body"
  exit 1
fi

applied="$(python3 -c "
import json, sys
raw = json.load(open(sys.argv[1]))
if isinstance(raw, dict):
    msg = raw.get('message') or raw.get('error') or raw
    raise SystemExit(f'API error: {msg}')
if not isinstance(raw, list):
    raise SystemExit(f'unexpected response type: {type(raw).__name__}')
print('\n'.join(r['name'] for r in raw if isinstance(r, dict) and 'name' in r))
" "$query_body")"
rm -f "$query_body"

echo "→ Pushing migrations to ${PROJECT_REF}..."
count=0
skipped=0
for f in supabase/migrations/*.sql; do
  name="$(basename "$f" .sql)"
  if echo "$applied" | grep -qxF "$name"; then
    skipped=$((skipped + 1))
    continue
  fi
  apply_migration "$f"
  count=$((count + 1))
done
echo "✓ Applied ${count} migrations (${skipped} already present)"

echo "→ Regenerating types..."
if [[ -x bin/supabase ]]; then
  bin/supabase gen types typescript --linked > src/integrations/supabase/types.ts 2>/dev/null || \
    echo "  (skip types — run after link if needed)"
fi
echo "✓ Done"

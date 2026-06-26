#!/usr/bin/env bash
# List Supabase migrations in repo that are not yet applied on remote.
# Exit 0 if none pending; exit 1 if any pending (for production deploy gate).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT/Solo-Code/supabase/migrations"
PROJECT_REF="${SUPABASE_PROJECT_REF:-zkflkpbmbozrchqncpzi}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f "${HOME}/.config/supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(<"${HOME}/.config/supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ไม่พบ SUPABASE_ACCESS_TOKEN — ไม่สามารถเช็ค migration บน remote ได้" >&2
  echo "   export SUPABASE_ACCESS_TOKEN=sbp_...  หรือ  npx supabase login" >&2
  exit 2
fi

query_body="$(mktemp)"
query_code="$(curl -s -o "$query_body" -w "%{http_code}" \
  -X POST "${API}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;"}')"

if [[ "$query_code" != "200" && "$query_code" != "201" ]]; then
  echo "✗ ดึงรายการ migration จาก remote ไม่ได้ ($query_code)" >&2
  head -c 500 "$query_body" >&2
  echo "" >&2
  rm -f "$query_body"
  exit 2
fi

applied="$(node -e "
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
if (!Array.isArray(raw)) {
  const msg = raw.message || raw.error || JSON.stringify(raw);
  console.error('API error:', msg);
  process.exit(1);
}
console.log(raw.filter(r => r && r.name).map(r => r.name).join('\n'));
" "$query_body")"
rm -f "$query_body"

pending=()
for f in "$MIG_DIR"/*.sql; do
  name="$(basename "$f" .sql)"
  if ! echo "$applied" | grep -qxF "$name"; then
    pending+=("$name")
  fi
done

if [[ ${#pending[@]} -eq 0 ]]; then
  echo "✓ ไม่มี migration ค้าง (remote ตรงกับ Solo-Code/supabase/migrations/)"
  exit 0
fi

echo "✗ มี migration ค้าง ${#pending[@]} ไฟล์ — push ก่อน production:" >&2
printf '  - %s\n' "${pending[@]}" >&2
echo "" >&2
echo "  cd Solo-Code && ./scripts/supabase-push-via-api.sh" >&2
exit 1

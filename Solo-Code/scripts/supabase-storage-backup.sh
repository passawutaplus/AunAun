#!/usr/bin/env bash
# Inventory (and optionally download) Supabase Storage buckets.
# Database daily backups do NOT include Storage objects — run this separately.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"
BACKUP_DIR="${BACKUP_DIR:-../backups/storage}"
MODE="${1:-inventory}" # inventory | download

SUPABASE_URL="${SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && [[ -f .env ]]; then
  line="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env 2>/dev/null | head -1 || true)"
  if [[ -n "$line" ]]; then
    SUPABASE_SERVICE_ROLE_KEY="${line#SUPABASE_SERVICE_ROLE_KEY=}"
    export SUPABASE_SERVICE_ROLE_KEY
  fi
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_SERVICE_ROLE_KEY (server-only, ไม่ใช่ anon key)"
  exit 1
fi

# So1o buckets + shared Anthem media bucket
read -r -d '' BUCKETS <<'EOF' || true
brand-logos
brief-references
job-tracker
chat-images
supplier-files
supplier-covers
expense-receipts
wht-certificates
ticket-attachments
project-media
EOF

auth=(-H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

list_objects() {
  local bucket="$1"
  local prefix="${2:-}"
  local limit=1000
  local offset=0
  local total=0

  while true; do
    local url="${SUPABASE_URL}/storage/v1/object/list/${bucket}"
    local body
    body="$(python3 -c "
import json, sys
print(json.dumps({'prefix': sys.argv[1], 'limit': int(sys.argv[2]), 'offset': int(sys.argv[3])}))
" "$prefix" "$limit" "$offset")"

    local resp
    resp="$(curl -sS "${auth[@]}" -H "Content-Type: application/json" -X POST "$url" -d "$body")"
    local count
    count="$(python3 -c "
import json, sys
data = json.loads(sys.argv[1])
if not isinstance(data, list):
    raise SystemExit('list error: ' + str(data)[:200])
print(len(data))
for o in data:
    print(o.get('name',''))
" "$resp")"

    local n
    n="$(echo "$count" | head -1)"
    mapfile -t names < <(echo "$count" | tail -n +2)
    total=$((total + n))

    if [[ "$MODE" == "download" ]]; then
      for name in "${names[@]}"; do
        [[ -z "$name" ]] && continue
        local dest="${BACKUP_DIR}/${bucket}/${prefix}${name}"
        mkdir -p "$(dirname "$dest")"
        curl -sS "${auth[@]}" \
          "${SUPABASE_URL}/storage/v1/object/${bucket}/${prefix}${name}" \
          -o "$dest" || echo "  ✗ failed: ${bucket}/${prefix}${name}"
      done
    fi

    [[ "$n" -lt "$limit" ]] && break
    offset=$((offset + limit))
  done
  echo "$total"
}

echo "→ Storage backup mode: ${MODE}"
echo "  Project: ${PROJECT_REF}"
mkdir -p "$BACKUP_DIR"

grand=0
while IFS= read -r bucket; do
  [[ -z "$bucket" ]] && continue
  count="$(list_objects "$bucket")"
  grand=$((grand + count))
  echo "  ${bucket}: ${count} object(s)"
done <<< "$BUCKETS"

echo "✓ Total objects inventoried: ${grand}"
if [[ "$MODE" == "inventory" ]]; then
  echo "  Full download: ./scripts/supabase-storage-backup.sh download"
  echo "  (อาจใช้เวลานาน + ใช้ bandwidth — แนะนำ schedule รายสัปดาห์)"
fi

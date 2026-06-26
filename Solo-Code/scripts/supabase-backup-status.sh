#!/usr/bin/env bash
# Report Supabase org plan + scheduled backup availability (Management API).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-zkflkpbmbozrchqncpzi}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f "${HOME}/.config/supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(<"${HOME}/.config/supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f .env ]]; then
  line="$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env 2>/dev/null | head -1 || true)"
  if [[ -n "$line" ]]; then
    SUPABASE_ACCESS_TOKEN="${line#SUPABASE_ACCESS_TOKEN=}"
    export SUPABASE_ACCESS_TOKEN
  fi
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ก่อน (Dashboard → Account → Access Tokens)"
  exit 1
fi

auth=(-H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

project_json="$(mktemp)"
org_json="$(mktemp)"
backups_json="$(mktemp)"
trap 'rm -f "$project_json" "$org_json" "$backups_json"' EXIT

code="$(curl -sS -o "$project_json" -w "%{http_code}" "${auth[@]}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}")"
if [[ "$code" != "200" ]]; then
  echo "✗ Failed to fetch project ($code)"
  head -c 400 "$project_json"
  echo ""
  exit 1
fi

org_id="$(python3 -c "import json; print(json.load(open('$project_json'))['organization_id'])")"
curl -sS -o "$org_json" "${auth[@]}" "https://api.supabase.com/v1/organizations/${org_id}" >/dev/null
curl -sS -o "$backups_json" "${auth[@]}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/backups" >/dev/null

python3 - <<'PY' "$project_json" "$org_json" "$backups_json" "$PROJECT_REF"
import json, sys
from datetime import datetime, timezone

project_path, org_path, backups_path, ref = sys.argv[1:]
project = json.load(open(project_path))
org = json.load(open(org_path))
backups = json.load(open(backups_path))

plan = org.get("plan", "?")
name = project.get("name", ref)
status = project.get("status", "?")
region = project.get("region", "?")
items = backups.get("backups") or []
pitr = backups.get("pitr_enabled", False)

print(f"Project : {name} ({ref})")
print(f"Status  : {status}")
print(f"Region  : {region}")
print(f"Org     : {org.get('name', '?')} — plan: {plan}")
print(f"PITR    : {'enabled' if pitr else 'disabled'}")
print(f"Backups : {len(items)} scheduled snapshot(s) visible via API")

if plan == "free":
    print()
    print("⚠  Organization ยังเป็น Free — ไม่มี daily backup อัตโนมัติจาก Supabase")
    print("   → อัปเกรด Pro ที่ Dashboard → Organization → Billing ($25/mo)")
    print(f"   → https://supabase.com/dashboard/org/{org.get('slug', org.get('id'))}/billing")
    print("   → ระหว่างรอ Pro: รัน ./scripts/supabase-backup.sh เป็น schedule (pg_dump)")
elif not items and not pitr:
    print()
    print("⚠  Pro/Team แต่ยังไม่เห็น backup — รอ daily snapshot แรก (มักภายใน 24 ชม.)")
    print(f"   → https://supabase.com/dashboard/project/{ref}/database/backups/scheduled")
else:
    print()
    print("✓  มี scheduled backup — restore ได้ที่ Dashboard → Database → Backups")
    for b in items[:5]:
        inserted = b.get("inserted_at") or b.get("created_at") or "?"
        print(f"   - {inserted}")

print()
print("Docs: ../../docs/backup-restore.md")
PY

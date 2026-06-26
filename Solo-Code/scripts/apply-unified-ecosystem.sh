#!/usr/bin/env bash
# Apply unified ecosystem DB: migrations → anthem bundle → expose API schemas
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-zkflkpbmbozrchqncpzi}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f "${HOME}/.config/supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(<"${HOME}/.config/supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ก่อน (Dashboard → Account → Access Tokens)"
  echo "   export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

echo "→ Step 1: push migrations (รวม seed 20260606140000)"
./scripts/supabase-push-via-api.sh

echo ""
echo "→ Step 2: expose API schemas (shared, anthem, so1o)"
if [[ -x bin/supabase ]]; then
  bin/supabase config push --project-ref "$PROJECT_REF" || \
    echo "  (ถ้า config push ล้มเหลว: Dashboard → API → Exposed schemas → เพิ่ม shared, anthem, so1o)"
fi

echo ""
echo "→ Step 3: anthem tables (ไฟล์ใหญ่ — SQL Editor)"
echo "   supabase/manual/apply-anthem-ecosystem.sql"
echo ""
echo "→ Step 4: seed (หลัง anthem tables + expose schemas)"
echo "   SQL Editor: ../../scripts/ecosystem/seed-catalog.sql"
echo "   หรือ: cd ../Anthem-Code && node scripts/run-seed.mjs"
echo "   (migration 20260606140000 จะ skip อัตโนมัติถ้ายังไม่มี anthem.projects)"
echo ""
echo "✓ migrations pushed — ทำ step 3–4 ต่อด้วยมือถ้ายังไม่รัน"

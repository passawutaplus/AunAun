#!/usr/bin/env bash
# Push ALL migrations via direct Postgres (needs SUPABASE_DB_PASSWORD)
# ทางเลือกที่ง่ายกว่า: ./scripts/supabase-push-via-api.sh (ใช้แค่ access token)
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="zkflkpbmbozrchqncpzi"
CLI="bin/supabase"

if [[ ! -x "$CLI" ]]; then
  echo "→ Installing Supabase CLI..."
  ./scripts/install-supabase-cli.sh
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ก่อน (Dashboard → Account → Access Tokens)"
  echo "   หรือรัน: bin/supabase login"
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "⚠  ต้องมีรหัสผ่าน Database ของโปรเจกต์"
  echo "   ดู/รีเซ็ตที่: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
  echo ""
  echo "   export SUPABASE_DB_PASSWORD='your-db-password'"
  echo "   แล้วรันสคริปต์นี้อีกครั้ง"
  echo ""
  echo "   ทางเลือก: วาง SQL ใน Dashboard → SQL Editor"
  echo "   ไฟล์: supabase/manual/apply-all-migrations.sql"
  exit 1
fi

echo "→ Linking project $PROJECT_REF..."
"$CLI" link --project-ref "$PROJECT_REF" -p "$SUPABASE_DB_PASSWORD" 2>/dev/null || \
  "$CLI" link --project-ref "$PROJECT_REF"

echo "→ Pushing ALL migrations..."
"$CLI" db push --linked --include-all -p "$SUPABASE_DB_PASSWORD"

echo "→ Regenerating TypeScript types..."
"$CLI" gen types typescript --linked > src/integrations/supabase/types.ts

echo "✓ Done — schema ขึ้นโปรเจกต์ ${PROJECT_REF} แล้ว"

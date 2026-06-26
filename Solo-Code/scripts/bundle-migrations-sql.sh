#!/usr/bin/env bash
# Concatenate all migrations into one SQL file for Dashboard SQL Editor
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="supabase/manual/apply-all-migrations.sql"
PROJECT_REF="zkflkpbmbozrchqncpzi"
count=0

{
  echo "-- So1o FULL schema bundle for ${PROJECT_REF}"
  echo "-- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "-- Run in Supabase Dashboard → SQL Editor"
  echo "-- Or: export SUPABASE_ACCESS_TOKEN=... && ./scripts/supabase-push-via-api.sh"
  echo ""
  for f in supabase/migrations/*.sql; do
    echo "-- ── $(basename "$f") ──"
    cat "$f"
    echo ""
    echo ""
    count=$((count + 1))
  done
} > "$OUT"

bytes=$(wc -c < "$OUT" | tr -d ' ')
echo "✓ Wrote ${OUT} (${count} migrations, ${bytes} bytes)"

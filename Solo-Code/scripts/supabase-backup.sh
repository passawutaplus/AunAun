#!/usr/bin/env bash
# Logical Postgres backup (pg_dump custom format) — works on Free and Pro tiers.
# Storage files are NOT included; see supabase-storage-backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"
BACKUP_DIR="${BACKUP_DIR:-../backups/db}"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-1-us-east-1.pooler.supabase.com}"
POOLER_PORT="${SUPABASE_POOLER_PORT:-5432}"
DB_USER="postgres.${PROJECT_REF}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="${BACKUP_DIR}/${PROJECT_REF}-${TIMESTAMP}.dump"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]] && [[ -f .env ]]; then
  line="$(grep -E '^SUPABASE_DB_PASSWORD=' .env 2>/dev/null | head -1 || true)"
  if [[ -n "$line" ]]; then
    SUPABASE_DB_PASSWORD="${line#SUPABASE_DB_PASSWORD=}"
    export SUPABASE_DB_PASSWORD
  fi
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_DB_PASSWORD ก่อน"
  echo "   export SUPABASE_DB_PASSWORD='...'   # Dashboard → Settings → Database"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

run_pg_dump() {
  if command -v pg_dump >/dev/null 2>&1; then
    local ver
    ver="$(pg_dump --version | awk '{print $3}' | cut -d. -f1)"
    if [[ "$ver" -lt 17 ]]; then
      echo "→ pg_dump v${ver} เก่ากว่า server (17) — ใช้ Docker postgres:17 แทน"
    else
      PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        -Fc -h "$POOLER_HOST" -p "$POOLER_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$OUTPUT"
      return 0
    fi
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "✗ ต้องมี docker หรือ pg_dump v17+"
    exit 1
  fi

  echo "→ pg_dump via Docker (postgres:17) → ${OUTPUT}"
  docker run --rm \
    -u "$(id -u):$(id -g)" \
    -e PGPASSWORD="$SUPABASE_DB_PASSWORD" \
    -v "${BACKUP_DIR}:/out" \
    postgres:17 \
    pg_dump -Fc \
      -h "$POOLER_HOST" -p "$POOLER_PORT" \
      -U "$DB_USER" -d "$DB_NAME" \
      -f "/out/$(basename "$OUTPUT")"
}

echo "→ Backing up ${PROJECT_REF} (database only, not Storage)..."
run_pg_dump

if [[ -f "$OUTPUT" ]]; then
  size="$(du -h "$OUTPUT" | awk '{print $1}')"
  echo "✓ Saved ${OUTPUT} (${size})"
  echo "  Restore: pg_restore -d \"postgresql://...\" --clean --if-exists ${OUTPUT}"
  echo "  Docs: ../../docs/backup-restore.md"
else
  echo "✗ Backup file not found"
  exit 1
fi

# Keep last N dumps (default 14)
KEEP="${BACKUP_KEEP:-14}"
if [[ "$KEEP" =~ ^[0-9]+$ ]] && [[ "$KEEP" -gt 0 ]]; then
  mapfile -t dumps < <(ls -1t "${BACKUP_DIR}/${PROJECT_REF}-"*.dump 2>/dev/null || true)
  if ((${#dumps[@]} > KEEP)); then
    for ((i = KEEP; i < ${#dumps[@]}; i++)); do
      rm -f "${dumps[i]}" && echo "  (pruned $(basename "${dumps[i]}"))"
    done
  fi
fi

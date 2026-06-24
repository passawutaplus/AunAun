#!/usr/bin/env bash
# Cron entrypoint: Supabase Postgres backup (see docs/backup-restore.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${BACKUP_LOG_DIR:-$ROOT/../logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/supabase-backup.log"

exec >>"$LOG_FILE" 2>&1
echo "=== $(date -Is) supabase-backup cron ==="

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

cd "$ROOT"

if [[ -f .env ]]; then
  line="$(grep -E '^SUPABASE_DB_PASSWORD=' .env 2>/dev/null | head -1 || true)"
  if [[ -n "$line" ]]; then
    SUPABASE_DB_PASSWORD="${line#SUPABASE_DB_PASSWORD=}"
    SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD%\"}"
    SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD#\"}"
    export SUPABASE_DB_PASSWORD
  fi
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: SUPABASE_DB_PASSWORD not set in $ROOT/.env"
  exit 1
fi

./scripts/supabase-backup.sh
echo "=== done $(date -Is) ==="

#!/usr/bin/env bash
# Install daily Supabase DB backup cron (03:00 local time).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRON_SCRIPT="$ROOT/scripts/cron-supabase-backup.sh"
MARKER="# aun-ecosystem-supabase-backup"
CRON_LINE="0 3 * * * $CRON_SCRIPT $MARKER"

chmod +x "$CRON_SCRIPT" "$ROOT/scripts/supabase-backup.sh"

existing="$(crontab -l 2>/dev/null || true)"
if echo "$existing" | grep -Fq "$MARKER"; then
  echo "✓ Cron already installed:"
  echo "$existing" | grep "$MARKER"
  exit 0
fi

{
  echo "$existing" | sed '/^$/d'
  echo "$CRON_LINE"
} | crontab -

echo "✓ Installed daily backup at 03:00"
echo "  Script: $CRON_SCRIPT"
echo "  Log:    ${BACKUP_LOG_DIR:-$ROOT/../logs}/supabase-backup.log"
echo "  Test:   $CRON_SCRIPT"

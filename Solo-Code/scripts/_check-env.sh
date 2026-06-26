#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
[ -f .env ] && source .env
set +a
echo "REF=${SUPABASE_PROJECT_REF:-unset}"
echo "HAS_DB_PW=$([ -n "${SUPABASE_DB_PASSWORD:-}" ] && echo yes || echo no)"
echo "HAS_SRK=$([ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && echo yes || echo no)"
echo "HAS_TOKEN=$([ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && echo yes || echo no)"

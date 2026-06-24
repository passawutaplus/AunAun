#!/usr/bin/env bash
# Push migrations to the unified Supabase project (canonical: Solo-Code/supabase/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/../Solo-Code/scripts/supabase-push-via-api.sh"

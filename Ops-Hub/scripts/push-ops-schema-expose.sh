#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../Solo-Code"

PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f .env ]]; then
  SUPABASE_ACCESS_TOKEN="$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env | head -1 | cut -d= -f2- | tr -d '"')"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && [[ -f "${HOME}/.config/supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(<"${HOME}/.config/supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ต้องมี SUPABASE_ACCESS_TOKEN"
  exit 1
fi

echo "→ expose ops schema via config push"
if [[ -x bin/supabase ]]; then
  yes n | bin/supabase config push --project-ref "$PROJECT_REF" 2>&1 || true
else
  yes n | npx supabase config push --project-ref "$PROJECT_REF" 2>&1 || true
fi

echo "→ verify remote API schemas"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/config/api"
curl -s "$API" -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
schemas=d.get('db_schema') or d.get('schemas') or d
print('schemas:', schemas)
"

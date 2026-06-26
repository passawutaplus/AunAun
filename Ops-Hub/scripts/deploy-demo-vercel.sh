#!/usr/bin/env bash
# Deploy Ops Hub preview to Vercel (*.vercel.app). Requires: vercel login, .env with Supabase keys.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — run ../scripts/sync-env-from-solo.sh or copy .env.example" >&2
  exit 1
fi

echo "→ Checking Vercel login…"
npx vercel whoami

if [[ ! -f .vercel/project.json ]]; then
  echo "→ Linking project (first time)…"
  npx vercel link --yes --project=so1o-ops-hub
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

: "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL in .env}"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?Set VITE_SUPABASE_PUBLISHABLE_KEY in .env}"

BUILD_ENVS=(
  --build-env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}"
  --build-env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}"
  --build-env "VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID:-zkflkpbmbozrchqncpzi}"
  --build-env "VITE_SO1O_APP_URL=${VITE_SO1O_APP_URL:-https://www.solofreelancer.com}"
  --build-env "VITE_ANTHEM_APP_URL=${VITE_ANTHEM_APP_URL:-https://an1hem.app}"
)

echo "→ Deploying Ops Hub preview…"
DEPLOY_OUTPUT="$(mktemp)"
npx vercel deploy --yes "${BUILD_ENVS[@]}" | tee "$DEPLOY_OUTPUT"
DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -1)"
rm -f "$DEPLOY_OUTPUT"
[[ -n "$DEPLOY_URL" ]] || { echo "Deploy failed — no URL returned" >&2; exit 1; }

echo ""
echo "✓ Ops Hub preview: ${DEPLOY_URL}"
echo ""
echo "Next steps:"
echo "  1. Supabase Dashboard → Authentication → URL Configuration"
echo "     Add: ${DEPLOY_URL%/}/**"
echo "  2. Login with admin account (user_roles.role = admin)"

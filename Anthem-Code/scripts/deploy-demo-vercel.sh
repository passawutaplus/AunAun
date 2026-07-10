#!/usr/bin/env bash
# Deploy Aplus1 demo to Vercel (preview). Requires: vercel login, dedicated demo Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill VITE_DEMO_SUPABASE_*" >&2
  exit 1
fi

echo "→ Checking Vercel login…"
npx vercel whoami

VERCEL_PROJECT="${VERCEL_ANTHEM_DEMO_PROJECT:-aplus1-demo}"

# shellcheck disable=SC1091
set -a && source .env && set +a
export VITE_DEMO_MODE=true

: "${VITE_DEMO_SUPABASE_URL:?Set VITE_DEMO_SUPABASE_URL in .env (must be a dedicated demo project)}"
: "${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY:?Set VITE_DEMO_SUPABASE_PUBLISHABLE_KEY in .env}"

if [[ -n "${VITE_SUPABASE_URL:-}" && "${VITE_DEMO_SUPABASE_URL}" == "${VITE_SUPABASE_URL}" ]]; then
  echo "ERROR: Demo Supabase URL must differ from production VITE_SUPABASE_URL" >&2
  exit 1
fi

echo "→ Checking build env…"
DEPLOY_TARGET=demo VITE_DEMO_MODE=true \
  VITE_DEMO_SUPABASE_URL="${VITE_DEMO_SUPABASE_URL}" \
  VITE_DEMO_SUPABASE_PUBLISHABLE_KEY="${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY}" \
  VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
  VITE_APLUS1_PAYMENTS_ENABLED=false \
  VITE_SOLO_ECOSYSTEM_ENABLED=false \
  node scripts/check-build-env.mjs

echo "→ Deploying demo to aplus1-demo.vercel.app (production slot on demo project)…"
if [[ "${1:-}" == "--prod" ]]; then
  echo "ERROR: Do not pass --prod to deploy-demo-vercel.sh (demo credentials would ship to production)." >&2
  echo "For production: ./scripts/deploy-vercel.sh production 1px" >&2
  exit 1
fi
BUILD_ENVS=(
  --build-env "DEPLOY_TARGET=demo"
  --build-env "VITE_DEMO_SUPABASE_URL=${VITE_DEMO_SUPABASE_URL}"
  --build-env "VITE_DEMO_SUPABASE_PUBLISHABLE_KEY=${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY}"
  --build-env "VITE_DEMO_MODE=true"
  --build-env "VITE_APLUS1_LAUNCH_MINIMAL=true"
  --build-env "VITE_APLUS1_PAYMENTS_ENABLED=false"
  --build-env "VITE_SOLO_ECOSYSTEM_ENABLED=false"
  --build-env "VITE_STRIPE_MODE=sandbox"
  --build-env "VITE_SO1O_APP_URL=${VITE_SO1O_APP_URL:-https://solofreelancer.com}"
)
BUILD_ENVS+=(--build-env "VITE_OPS_HUB_URL=${VITE_OPS_HUB_URL:-https://so1o-ops-hub.vercel.app}")

DEPLOY_OUTPUT="$(mktemp)"
npx vercel deploy --prod --yes --project="$VERCEL_PROJECT" "${BUILD_ENVS[@]}" | tee "$DEPLOY_OUTPUT"
DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -1)"
rm -f "$DEPLOY_OUTPUT"
[[ -n "$DEPLOY_URL" ]] || { echo "Deploy failed — no URL returned" >&2; exit 1; }

DEMO_CANONICAL="https://aplus1-demo.vercel.app"
echo "→ Aliasing ${DEMO_CANONICAL} …"
npx vercel alias set "$DEPLOY_URL" "aplus1-demo.vercel.app"

echo ""
echo "✓ Demo deployed: ${DEMO_CANONICAL}"
echo "  (deployment: ${DEPLOY_URL})"
echo ""
echo "Next steps:"
echo "  1. Supabase Dashboard → Authentication → URL Configuration"
echo "     Add redirect: ${DEMO_CANONICAL}/auth/callback"
echo "  2. Share the isolated demo account password through a private channel"
echo "  3. Production: ./scripts/deploy-vercel.sh production 1px"

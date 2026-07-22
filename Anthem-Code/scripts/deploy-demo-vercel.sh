#!/usr/bin/env bash
# Deploy Aplus1 demo to Vercel (preview). Requires: vercel login.
# Phase A: shared prod Supabase (auto when VITE_DEMO_SUPABASE_* unset, or VITE_DEMO_PHASE_A=true).
# Phase B: dedicated VITE_DEMO_SUPABASE_* different from production.
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

# Phase A (pre-launch): shared prod DB — see docs/ecosystem-deploy-policy.md
# Phase B: dedicated VITE_DEMO_SUPABASE_* (must differ from production URL)
PHASE_A=false
if [[ "${VITE_DEMO_PHASE_A:-}" == "true" || "${VITE_DEMO_PHASE_A:-}" == "1" ]]; then
  PHASE_A=true
fi
# Auto Phase A when dedicated demo credentials are missing (current pre-launch default)
if [[ "$PHASE_A" != "true" && -z "${VITE_DEMO_SUPABASE_URL:-}" ]]; then
  echo "→ No VITE_DEMO_SUPABASE_URL — using Phase A shared-DB demo"
  PHASE_A=true
  export VITE_DEMO_PHASE_A=true
fi

if [[ "$PHASE_A" == "true" ]]; then
  : "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL in .env (Phase A shared DB)}"
  : "${VITE_SUPABASE_PUBLISHABLE_KEY:?Set VITE_SUPABASE_PUBLISHABLE_KEY in .env}"
else
  : "${VITE_DEMO_SUPABASE_URL:?Set VITE_DEMO_SUPABASE_URL in .env (must be a dedicated demo project)}"
  : "${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY:?Set VITE_DEMO_SUPABASE_PUBLISHABLE_KEY in .env}"
  if [[ -n "${VITE_SUPABASE_URL:-}" && "${VITE_DEMO_SUPABASE_URL}" == "${VITE_SUPABASE_URL}" ]]; then
    echo "ERROR: Demo Supabase URL must differ from production VITE_SUPABASE_URL (or set VITE_DEMO_PHASE_A=true)" >&2
    exit 1
  fi
fi

echo "→ Checking build env…"
if [[ "$PHASE_A" == "true" ]]; then
  DEPLOY_TARGET=demo VITE_DEMO_MODE=true VITE_DEMO_PHASE_A=true \
    VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
    VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    VITE_APLUS1_PAYMENTS_ENABLED=false \
    VITE_SOLO_ECOSYSTEM_ENABLED=false \
    node scripts/check-build-env.mjs
else
  DEPLOY_TARGET=demo VITE_DEMO_MODE=true \
    VITE_DEMO_SUPABASE_URL="${VITE_DEMO_SUPABASE_URL}" \
    VITE_DEMO_SUPABASE_PUBLISHABLE_KEY="${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY}" \
    VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
    VITE_APLUS1_PAYMENTS_ENABLED=false \
    VITE_SOLO_ECOSYSTEM_ENABLED=false \
    node scripts/check-build-env.mjs
fi

echo "→ Deploying demo to aplus1-demo.vercel.app (production slot on demo project)…"
if [[ "${1:-}" == "--prod" ]]; then
  echo "ERROR: Do not pass --prod to deploy-demo-vercel.sh (demo credentials would ship to production)." >&2
  echo "For production: ./scripts/deploy-vercel.sh production 1px" >&2
  exit 1
fi
BUILD_ENVS=(
  --build-env "DEPLOY_TARGET=demo"
  --build-env "VITE_DEMO_MODE=true"
  --build-env "VITE_APLUS1_LAUNCH_MINIMAL=true"
  --build-env "VITE_APLUS1_PAYMENTS_ENABLED=false"
  --build-env "VITE_OMISE_CHARGES_ENABLED=true"
  --build-env "VITE_OMISE_MODE=test"
  --build-env "VITE_OMISE_PUBLIC_KEY=${OMISE_PUBLIC_KEY:-${VITE_OMISE_PUBLIC_KEY:-}}"
  --build-env "VITE_SOLO_ECOSYSTEM_ENABLED=false"
  --build-env "VITE_STRIPE_MODE=sandbox"
  --build-env "VITE_SO1O_APP_URL=${VITE_SO1O_APP_URL:-https://solofreelancer.com}"
)
if [[ "$PHASE_A" == "true" ]]; then
  BUILD_ENVS+=(
    --build-env "VITE_DEMO_PHASE_A=true"
    --build-env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}"
    --build-env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}"
  )
else
  BUILD_ENVS+=(
    --build-env "VITE_DEMO_SUPABASE_URL=${VITE_DEMO_SUPABASE_URL}"
    --build-env "VITE_DEMO_SUPABASE_PUBLISHABLE_KEY=${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY}"
  )
fi
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

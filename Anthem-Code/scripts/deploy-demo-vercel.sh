#!/usr/bin/env bash
# Deploy Pixel100 demo to Vercel (preview). Requires: vercel login, .env with Supabase keys.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill VITE_SUPABASE_*" >&2
  exit 1
fi

echo "→ Checking Vercel login…"
npx vercel whoami

if [[ ! -f .vercel/project.json ]]; then
  echo "→ Linking project (first time)…"
  npx vercel link --yes --project=1px-demo
fi

# shellcheck disable=SC1091
set -a && source .env && set +a
export VITE_DEMO_MODE=true
# ไม่บังคับ VITE_SITE_URL — ให้ OAuth ใช้ *.vercel.app อัตโนมัติบน preview

: "${VITE_DEMO_SUPABASE_URL:?Set VITE_DEMO_SUPABASE_URL in .env}"
: "${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY:?Set VITE_DEMO_SUPABASE_PUBLISHABLE_KEY in .env}"
if [[ -n "${VITE_SUPABASE_URL:-}" && "${VITE_DEMO_SUPABASE_URL}" == "${VITE_SUPABASE_URL}" ]]; then
  echo "ERROR: Demo and production must use different Supabase projects." >&2
  exit 1
fi

echo "→ Deploying demo to 1px-demo.vercel.app (production slot on demo project)…"
if [[ "${1:-}" == "--prod" ]]; then
  echo "ERROR: Do not pass --prod to deploy-demo-vercel.sh (demo credentials would ship to production)." >&2
  echo "For production: set VITE_DEMO_MODE=false in Vercel and use: npx vercel deploy --prod" >&2
  exit 1
fi
BUILD_ENVS=(
  --build-env "VITE_DEMO_SUPABASE_URL=${VITE_DEMO_SUPABASE_URL}"
  --build-env "VITE_DEMO_SUPABASE_PUBLISHABLE_KEY=${VITE_DEMO_SUPABASE_PUBLISHABLE_KEY}"
  --build-env "VITE_DEMO_MODE=true"
)
if [[ -n "${VITE_SO1O_APP_URL:-}" ]]; then
  BUILD_ENVS+=(--build-env "VITE_SO1O_APP_URL=${VITE_SO1O_APP_URL}")
fi
BUILD_ENVS+=(--build-env "VITE_OPS_HUB_URL=${VITE_OPS_HUB_URL:-https://so1o-ops-hub.vercel.app}")

DEPLOY_OUTPUT="$(mktemp)"
npx vercel deploy --prod --yes "${BUILD_ENVS[@]}" | tee "$DEPLOY_OUTPUT"
DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -1)"
rm -f "$DEPLOY_OUTPUT"
[[ -n "$DEPLOY_URL" ]] || { echo "Deploy failed — no URL returned" >&2; exit 1; }

echo ""
echo "✓ Demo deployed: ${DEPLOY_URL}"
echo ""
echo "Next steps:"
echo "  1. Supabase Dashboard → Authentication → URL Configuration"
echo "     Add redirect: ${DEPLOY_URL%/}/auth/callback"
echo "  2. Share the isolated demo account password through a private channel"
echo "  3. Production: VITE_DEMO_MODE=false + npx vercel deploy --prod (never use this script with --prod)"

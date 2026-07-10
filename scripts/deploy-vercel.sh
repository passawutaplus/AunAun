#!/usr/bin/env bash
# Deploy demo (preview) or production on Vercel.
# Usage:
#   ./scripts/deploy-vercel.sh demo [1px|solo|vault]
#   ./scripts/deploy-vercel.sh production [1px|solo|vault]
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"
APP="${2:-}"

usage() {
  echo "Usage: $0 demo|production [1px|solo|anthem|so1o|vault]" >&2
  echo "" >&2
  echo "  demo        → Vercel preview (แชร์ให้คนอื่นลอง)" >&2
  echo "  production  → vercel deploy --prod (พนักงานใช้จริง)" >&2
  exit 1
}

normalize_app() {
  case "${1,,}" in
    1px|anthem|an1hem|aplus1-demo|aplus1) echo "1px" ;;
    solo|so1o|solofreelancer) echo "solo" ;;
    vault|aplus-vault|aplusvault) echo "vault" ;;
    *) return 1 ;;
  esac
}

[[ -n "$MODE" && -n "$APP" ]] || usage
APP_KEY="$(normalize_app "$APP")" || usage

case "$MODE" in
  demo|production|prod) ;;
  *) usage ;;
esac

if [[ "$MODE" == "production" || "$MODE" == "prod" ]]; then
  echo "→ Checking pending Supabase migrations…"
  if ! ./scripts/check-migrations-pending.sh; then
    echo "" >&2
    echo "Abort production deploy until migrations are pushed." >&2
    exit 1
  fi
fi

deploy_demo() {
  local dir="$1"
  (cd "$dir" && npm run deploy:demo)
}

deploy_production() {
  local dir="$1"
  local site_url="$2"
  local vercel_project="$3"

  if [[ ! -f "$dir/.env" ]]; then
    echo "Missing $dir/.env" >&2
    exit 1
  fi

  # shellcheck disable=SC1091
  set -a && source "$dir/.env" && set +a

  echo "→ Checking Vercel login…"
  npx vercel whoami

  if [[ ! -f "$dir/.vercel/project.json" ]]; then
    echo "→ Linking Vercel project $vercel_project…"
    (cd "$dir" && npx vercel link --yes --project="$vercel_project")
  fi

  export DEPLOY_TARGET=production
  export VITE_DEMO_MODE=false

  if [[ "$dir" == *Anthem-Code* ]]; then
    echo "→ Regenerating sitemap for $site_url…"
    (cd "$dir" && VITE_SITE_URL="$site_url" npm run sitemap:gen)
    echo "→ Checking build env…"
    (cd "$dir" && node scripts/check-build-env.mjs)
  fi

  BUILD_ENVS=(
    --build-env "VITE_DEMO_MODE=false"
    --build-env "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL}"
    --build-env "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:?Set VITE_SUPABASE_PUBLISHABLE_KEY}"
  )
  if [[ -n "${VITE_SITE_URL:-}" ]]; then
    BUILD_ENVS+=(--build-env "VITE_SITE_URL=${VITE_SITE_URL}")
  elif [[ -n "$site_url" ]]; then
    BUILD_ENVS+=(--build-env "VITE_SITE_URL=${site_url}")
  fi
  if [[ "$dir" == *Anthem-Code* ]]; then
    BUILD_ENVS+=(--build-env "VITE_SO1O_APP_URL=${VITE_SO1O_APP_URL:-https://solofreelancer.com}")
    BUILD_ENVS+=(--build-env "VITE_OPS_HUB_URL=${VITE_OPS_HUB_URL:-https://so1o-ops-hub.vercel.app}")
    BUILD_ENVS+=(--build-env "VITE_APLUS1_LAUNCH_MINIMAL=true")
    BUILD_ENVS+=(--build-env "VITE_APLUS1_PAYMENTS_ENABLED=false")
    BUILD_ENVS+=(--build-env "VITE_SOLO_ECOSYSTEM_ENABLED=false")
    BUILD_ENVS+=(--build-env "VITE_STRIPE_MODE=sandbox")
  fi

  DEPLOY_OUTPUT="$(mktemp)"
  (cd "$dir" && npx vercel deploy --prod --yes --project="$vercel_project" "${BUILD_ENVS[@]}") | tee "$DEPLOY_OUTPUT"
  DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.(vercel\.app|[a-z0-9.-]+)' "$DEPLOY_OUTPUT" | tail -1)"
  rm -f "$DEPLOY_OUTPUT"

  echo ""
  echo "✓ Production deployed${DEPLOY_URL:+: $DEPLOY_URL}"
  echo "  Smoke (Vercel): BASE_URL=${DEPLOY_URL:-$site_url} $dir/scripts/smoke-public.sh"

  if [[ "$dir" == *Solo-Code* ]]; then
    echo ""
    echo "→ Custom domain ${site_url} must point to Vercel (A → 76.76.21.21)."
    echo "  Run: ./scripts/cutover-solo-dns-vercel.sh"
  fi
}

case "$APP_KEY" in
  1px)
    if [[ "$MODE" == "demo" ]]; then
      deploy_demo Anthem-Code
    else
      deploy_production Anthem-Code "https://aplus1.app" "aplus1-prod"
    fi
    ;;
  solo)
    if [[ "$MODE" == "demo" ]]; then
      deploy_demo Solo-Code
    else
      deploy_production Solo-Code "https://solofreelancer.com" "solo-demo"
    fi
    ;;
  vault)
    if [[ "$MODE" == "demo" ]]; then
      deploy_demo Vault-Code
    else
      (cd Vault-Code && npm run deploy:production)
    fi
    ;;
esac

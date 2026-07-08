#!/usr/bin/env bash
# Deploy A+ Vault production to Vercel (aplus-vault project).
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f "$ROOT/scripts/check-migrations-pending.sh" ]]; then
  echo "→ Checking pending Supabase migrations…"
  set +e
  bash "$ROOT/scripts/check-migrations-pending.sh"
  mig_status=$?
  set -e
  if [[ "$mig_status" -eq 1 ]]; then
    echo "Abort production deploy until migrations are pushed." >&2
    exit 1
  fi
  if [[ "$mig_status" -eq 2 ]]; then
    echo "⚠ Migration remote check unavailable — continuing only if you verified no pending SQL elsewhere."
  fi
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found" >&2
  exit 1
fi

VERCEL_PROJECT="${VERCEL_VAULT_PROD_PROJECT:-aplus-vault}"
VERCEL_SCOPE="${VERCEL_SCOPE:-passawutaplus-9338s-projects}"
# Force production canonical URL (ignore polluted shell / prior demo exports).
VAULT_SITE_URL="https://aplus-vault.vercel.app"
unset SITE_URL VITE_SITE_URL || true

export DEPLOY_TARGET=production
export VAULT_DEMO_MODE=false
export VAULT_SITE_URL

echo "→ Running test gate before production deploy…"
npm run test:gate

echo "→ Checking Vercel login…"
npx vercel whoami

if [[ ! -f .vercel/project.json ]] || ! grep -q "\"projectName\":\"${VERCEL_PROJECT}\"" .vercel/project.json 2>/dev/null; then
  echo "→ Linking Vercel project ${VERCEL_PROJECT}…"
  rm -rf .vercel
  npx vercel link --yes --project="$VERCEL_PROJECT" --scope "$VERCEL_SCOPE"
fi

DEPLOY_OUTPUT="$(mktemp)"
npx vercel deploy --prod --yes --project="$VERCEL_PROJECT" --scope "$VERCEL_SCOPE" \
  --build-env "VAULT_SITE_URL=${VAULT_SITE_URL}" \
  --build-env "VAULT_DEMO_MODE=false" \
  --build-env "DEPLOY_TARGET=production" | tee "$DEPLOY_OUTPUT"
DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -1)"
rm -f "$DEPLOY_OUTPUT"
[[ -n "$DEPLOY_URL" ]] || { echo "Deploy failed — no URL returned" >&2; exit 1; }

# Smoke against the public alias (deployment *.vercel.app URLs may be SSO-gated).
SMOKE_URL="${VAULT_SITE_URL}"

echo ""
echo "→ Post-deploy public smoke…"
BASE_URL="$SMOKE_URL" npm run smoke:public

echo ""
echo "→ Post-deploy API smoke…"
VAULT_BASE_URL="$SMOKE_URL" npm run smoke:api

echo ""
echo "✓ Vault PRODUCTION deployed: ${DEPLOY_URL}"
echo "  Alias: ${VAULT_SITE_URL}"
echo ""
echo "Demo (testers): https://aplus-vault-demo.vercel.app — npm run deploy:demo"

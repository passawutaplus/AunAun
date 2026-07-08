#!/usr/bin/env bash
# Deploy A+ Vault demo to Vercel (aplus-vault-demo project).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found" >&2
  exit 1
fi

VERCEL_PROJECT="${VERCEL_VAULT_DEMO_PROJECT:-aplus-vault-demo}"
VERCEL_SCOPE="${VERCEL_SCOPE:-passawutaplus-9338s-projects}"
# Force demo canonical URL (ignore polluted shell SITE_URL / prior prod exports).
VAULT_SITE_URL="https://aplus-vault-demo.vercel.app"
unset SITE_URL VITE_SITE_URL || true

export DEPLOY_TARGET=demo
export VAULT_DEMO_MODE=true
export VAULT_SITE_URL

echo "→ Running test gate before demo deploy…"
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
  --build-env "VAULT_DEMO_MODE=true" \
  --build-env "DEPLOY_TARGET=demo" | tee "$DEPLOY_OUTPUT"
DEPLOY_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -1)"
rm -f "$DEPLOY_OUTPUT"
[[ -n "$DEPLOY_URL" ]] || { echo "Deploy failed — no URL returned" >&2; exit 1; }

echo ""
echo "→ Post-deploy public smoke…"
BASE_URL="$DEPLOY_URL" npm run smoke:public

echo ""
echo "→ Post-deploy API smoke…"
VAULT_BASE_URL="$DEPLOY_URL" npm run smoke:api

echo ""
echo "✓ Vault DEMO deployed: ${DEPLOY_URL}"
echo "  Expected alias: ${VAULT_SITE_URL}"
echo ""
echo "Share with testers:"
echo "  Demo guide: ${DEPLOY_URL}/demo"
echo "  Vault app:  ${DEPLOY_URL}/vault"
echo "  Pack:       docs/DEMO_PACK.md"
echo ""
echo "Production (staff): https://aplus-vault.vercel.app — npm run deploy:production"

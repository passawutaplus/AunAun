#!/usr/bin/env bash
# Deploy A+ Vault alpha demo to Vercel (production slot on aplus-vault project).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found" >&2
  exit 1
fi

VERCEL_PROJECT="${VERCEL_VAULT_PROJECT:-aplus-vault}"
VERCEL_SCOPE="${VERCEL_SCOPE:-passawutaplus-9338s-projects}"

echo "→ Running test gate before deploy…"
npm run test:gate

echo "→ Checking Vercel login…"
npx vercel whoami

if [[ ! -f .vercel/project.json ]]; then
  echo "→ Linking Vercel project ${VERCEL_PROJECT}…"
  npx vercel link --yes --project="$VERCEL_PROJECT" --scope "$VERCEL_SCOPE"
fi

DEPLOY_OUTPUT="$(mktemp)"
npx vercel deploy --prod --yes --project="$VERCEL_PROJECT" --scope "$VERCEL_SCOPE" | tee "$DEPLOY_OUTPUT"
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
echo "✓ Vault demo deployed: ${DEPLOY_URL}"
echo "  Alias: https://aplus-vault.vercel.app"
echo ""
echo "Share with testers:"
echo "  Demo guide: ${DEPLOY_URL}/demo"
echo "  Vault app:  ${DEPLOY_URL}/vault"
echo "  Pack:       docs/DEMO_PACK.md"
echo ""
echo "Extension: load unpacked from vault-extension/"

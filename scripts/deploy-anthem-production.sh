#!/usr/bin/env bash
# Deploy an1hem to a separate VPS with HTTPS (an1hem.app).
# Prereqs: DNS A records for an1hem.app + www → this VPS; ports 80/443 open.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "→ Copy anthem.env.example → .env and set keys"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "→ Build & start an1hem + Caddy HTTPS"
docker compose \
  -f docker-compose.anthem.yml \
  -f docker-compose.anthem.https.yml \
  up --build -d

docker compose -f docker-compose.anthem.yml ps
echo ""
echo "✓ Aplus1 production: ${VITE_ANTHEM_APP_URL:-https://aplus1.app}"
echo "  Verify: SO1O_URL=skip HUB_URL=skip ./scripts/health-check.sh"

#!/usr/bin/env bash
# Deploy Ops Hub to a separate VPS with HTTPS (hq.solofreelancer.com).
# Prereqs: DNS A record for hq.solofreelancer.com → this VPS; ports 80/443 open.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "→ Copy ops-hub.env.example → .env and set keys"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "→ Build & start Ops Hub + Caddy HTTPS"
docker compose \
  -f docker-compose.ops-hub.yml \
  -f docker-compose.ops-hub.https.yml \
  up --build -d

docker compose -f docker-compose.ops-hub.yml ps
echo ""
echo "✓ Ops Hub production: ${VITE_OPS_HUB_URL:-https://hq.solofreelancer.com}"
echo "  Verify: SO1O_URL=skip ANTHEM_URL=skip ./scripts/health-check.sh"

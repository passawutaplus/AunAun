#!/usr/bin/env bash
# Deploy Ops Hub only (isolated from So1o / an1hem).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "→ Copy .env.vps.example → .env"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "→ Deploy Ops Hub (standalone compose)"
docker compose -f docker-compose.ops-hub.yml up --build -d
docker compose -f docker-compose.ops-hub.yml ps
echo "✓ Ops Hub on port ${HTTP_PORT:-3091}"

#!/usr/bin/env bash
# Deploy an1hem only (isolated from So1o / Ops Hub).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "→ Copy .env.vps.example → .env and set VITE_* URLs"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "→ Deploy an1hem (standalone compose)"
docker compose -f docker-compose.anthem.yml up --build -d
docker compose -f docker-compose.anthem.yml ps
echo "✓ an1hem on port ${HTTP_PORT:-8080}"

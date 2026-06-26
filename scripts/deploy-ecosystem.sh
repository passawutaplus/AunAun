#!/usr/bin/env bash
# Deploy So1o + an1hem + Ops Hub on VPS (HTTP or HTTPS via Caddy).
set -euo pipefail
cd "$(dirname "$0")/.."

USE_HTTPS=false
BUILD_ARGS=(--build -d)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --https) USE_HTTPS=true; shift ;;
    --no-build) BUILD_ARGS=(-d); shift ;;
    *) echo "Usage: $0 [--https] [--no-build]"; exit 1 ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "→ สร้าง .env จาก .env.vps.example"
  cp .env.vps.example .env
  echo "   แก้ค่าใน .env ให้ครบ (Supabase keys, URLs) แล้วรันสคริปต์นี้อีกครั้ง"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "→ Domains:"
echo "   So1o:    ${VITE_SO1O_APP_URL:-https://solofreelancer.com}"
echo "   Aplus1:  ${VITE_ANTHEM_APP_URL:-https://aplus1.app}"
echo "   Ops Hub: ${VITE_OPS_HUB_URL:-https://hq.solofreelancer.com}"
echo "   Demo mode (an1hem): ${VITE_DEMO_MODE:-false}"

COMPOSE_FILES=(-f docker-compose.yml)
if [[ "$USE_HTTPS" == true ]]; then
  COMPOSE_FILES+=(-f docker-compose.https.yml)
  echo "→ HTTPS: Caddy + Let's Encrypt (ต้องชี้ DNS มา VPS แล้ว)"
else
  echo "→ HTTP only (พอร์ต ${HTTP_PORT:-80}) — ใช้ --https สำหรับ OAuth production"
fi

docker compose "${COMPOSE_FILES[@]}" up "${BUILD_ARGS[@]}"
docker compose "${COMPOSE_FILES[@]}" ps

echo ""
echo "✓ Deploy เสร็จ"
echo "  ตรวจสุขภาพ: docker compose ${COMPOSE_FILES[*]} logs -f --tail=50"
if [[ "$USE_HTTPS" != true ]]; then
  echo "  สำหรับแชร์ให้ UX reviewer: รัน ./scripts/deploy-ecosystem.sh --https หลังตั้ง DNS"
fi

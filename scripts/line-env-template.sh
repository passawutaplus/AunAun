#!/usr/bin/env bash
# รันครั้งเดียวหลังได้ Channel Login — สร้าง .env.line แล้ว deploy
# ใช้: ./scripts/line-env-template.sh
set -euo pipefail
SOLO="$(cd "$(dirname "$0")/../Solo-Code" && pwd)"
ENV_LINE="$SOLO/.env.line"

if [[ -f "$ENV_LINE" ]]; then
  echo "มี $ENV_LINE อยู่แล้ว — แก้ด้วยมือหรือลบก่อนรันใหม่"
  exit 1
fi

read -r -p "LINE Login Channel ID [2010369791]: " CID
CID="${CID:-2010369791}"
read -r -s -p "LINE Login Channel secret: " SECRET
echo ""
read -r -s -p "Messaging API access token (Enter ข้ามถ้ายังไม่มี): " TOKEN
echo ""

cat > "$ENV_LINE" <<EOF
LINE_CHANNEL_ID=$CID
LINE_CHANNEL_SECRET=$SECRET
LINE_CHANNEL_ACCESS_TOKEN=$TOKEN
EOF
chmod 600 "$ENV_LINE"

MAIN="$SOLO/.env"
if grep -q '^VITE_LINE_CHANNEL_ID=' "$MAIN" 2>/dev/null; then
  sed -i "s|^VITE_LINE_CHANNEL_ID=.*|VITE_LINE_CHANNEL_ID=$CID|" "$MAIN"
else
  echo "VITE_LINE_CHANNEL_ID=$CID" >> "$MAIN"
fi

echo "สร้าง $ENV_LINE แล้ว — รัน ./scripts/setup-line.sh ต่อ"

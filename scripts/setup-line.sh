#!/usr/bin/env bash
# LINE @solofreelancer — ตั้ง secrets + deploy edge functions
# ใช้: สร้างไฟล์ Solo-Code/.env.line (ไม่ commit) แล้วรันสคริปต์นี้
#
# ตัวอย่าง Solo-Code/.env.line:
#   LINE_CHANNEL_ID=2010369565
#   LINE_CHANNEL_SECRET=your_secret
#   LINE_CHANNEL_ACCESS_TOKEN=your_messaging_token
#   VITE_LINE_LIFF_ID=optional-liff-id

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOLO="$ROOT/Solo-Code"
ENV_FILE="${LINE_ENV_FILE:-$SOLO/.env.line}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"

echo "=== So1o LINE setup ==="
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  cat <<'EOF'
ยังไม่มีไฟล์ secrets สำหรับ LINE

สร้างไฟล์นี้ (ห้าม commit):
  Solo-Code/.env.line

เนื้อหาตัวอย่าง:
  LINE_CHANNEL_ID=2010369565
  LINE_CHANNEL_SECRET=ใส่จาก LINE Console
  LINE_CHANNEL_ACCESS_TOKEN=ใส่จาก Messaging API (Issue token)
  VITE_LINE_LIFF_ID=ใส่หลังสร้าง LIFF (ไม่บังคับ)

จากนั้นรันอีกครั้ง:
  ./scripts/setup-line.sh

EOF
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${LINE_CHANNEL_ID:?ตั้ง LINE_CHANNEL_ID ใน .env.line}"
: "${LINE_CHANNEL_SECRET:?ตั้ง LINE_CHANNEL_SECRET ใน .env.line}"

echo "[1/3] ตั้ง Supabase secrets..."
cd "$SOLO"
supabase secrets set \
  LINE_CHANNEL_ID="$LINE_CHANNEL_ID" \
  LINE_CHANNEL_SECRET="$LINE_CHANNEL_SECRET" \
  ${LINE_CHANNEL_ACCESS_TOKEN:+LINE_CHANNEL_ACCESS_TOKEN="$LINE_CHANNEL_ACCESS_TOKEN"} \
  --project-ref "$PROJECT_REF"

echo "[2/3] Deploy edge functions..."
supabase functions deploy line-connect line-queue-process notify-hire-request \
  --project-ref "$PROJECT_REF"

echo "[3/3] ตรวจ client env ใน Solo-Code/.env"
MAIN_ENV="$SOLO/.env"
touch "$MAIN_ENV"
grep -q 'VITE_LINE_CHANNEL_ID' "$MAIN_ENV" || echo "VITE_LINE_CHANNEL_ID=$LINE_CHANNEL_ID" >> "$MAIN_ENV"
if [[ -n "${VITE_LINE_LIFF_ID:-}" ]]; then
  if grep -q 'VITE_LINE_LIFF_ID' "$MAIN_ENV"; then
    sed -i "s|^VITE_LINE_LIFF_ID=.*|VITE_LINE_LIFF_ID=$VITE_LINE_LIFF_ID|" "$MAIN_ENV"
  else
    echo "VITE_LINE_LIFF_ID=$VITE_LINE_LIFF_ID" >> "$MAIN_ENV"
  fi
fi

cat <<EOF

เสร็จฝั่ง server แล้ว

ทดสอบ:
  1. เปิด https://www.solofreelancer.com/line-link (หรือ localhost:3000/line-link)
  2. เข้าสู่ระบบ So1o → กด「เชื่อมด้วย LINE」
  3. Settings → เปิดแจ้งเตือน LINE

EOF

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

เนื้อหาตัวอย่าง (Channel ID = ช่อง LINE Login ใหม่ ไม่ใช่ Messaging API 2010369565):
  LINE_CHANNEL_ID=ใส่จากช่อง LINE Login → Basic settings
  LINE_CHANNEL_SECRET=ใส่จากช่อง LINE Login → Basic settings
  LINE_CHANNEL_ACCESS_TOKEN=ใส่จากช่อง Messaging API → Issue token
  LINE_MESSAGING_CHANNEL_SECRET=ใส่จากช่อง Messaging API → Basic settings (สำหรับ webhook AI)
  VITE_LINE_LIFF_ID=ใส่หลังสร้าง LIFF (ไม่บังคับ)

ถ้าหา Callback URL ไม่เจอ → อ่าน docs/setup-line.md หัวข้อ「ทำไมหา Callback ไม่เจอ」

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
SECRET_ARGS=(
  "LINE_CHANNEL_ID=$LINE_CHANNEL_ID"
  "LINE_CHANNEL_SECRET=$LINE_CHANNEL_SECRET"
)
[[ -n "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]] && SECRET_ARGS+=("LINE_CHANNEL_ACCESS_TOKEN=$LINE_CHANNEL_ACCESS_TOKEN")
[[ -n "${LINE_MESSAGING_CHANNEL_SECRET:-}" ]] && SECRET_ARGS+=("LINE_MESSAGING_CHANNEL_SECRET=$LINE_MESSAGING_CHANNEL_SECRET")
# LINE AI assistant shares Gemini with web Assistant
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  SECRET_ARGS+=("GEMINI_API_KEY=$GEMINI_API_KEY")
elif [[ -f "$SOLO/.env" ]]; then
  # shellcheck disable=SC1090
  GEMINI_FROM_ENV="$(grep -E '^GEMINI_API_KEY=' "$SOLO/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")"
  [[ -n "$GEMINI_FROM_ENV" ]] && SECRET_ARGS+=("GEMINI_API_KEY=$GEMINI_FROM_ENV")
fi
supabase secrets set "${SECRET_ARGS[@]}" --project-ref "$PROJECT_REF"

echo "[2/3] Deploy edge functions..."
supabase functions deploy line-connect line-queue-process line-webhook notify-hire-request \
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

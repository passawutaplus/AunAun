# AI — Google Gemini

So1o ใช้ **Google Gemini API โดยตรง** (ไม่ผ่าน Lovable AI Gateway แล้ว)

## Model pins (อัปเดตอัตโนมัติ)

แหล่งความจริงเดียว: [`config/gemini-models.json`](../config/gemini-models.json)

| Slot | ใช้กับ | ค่าเริ่มต้น (pin) |
|------|--------|------------------|
| `fast` | Chat เร็ว, lightweight | `gemini-3.1-flash-lite` |
| `default` | งานทั่วไป | `gemini-3.5-flash` |
| `vision` | PDF/รูป, WHT 50ทวิ scan | `gemini-3.5-flash` |
| `embedding` | Vector search | `text-embedding-004` |

**นโยบาย:** ระบบจะเลือก model ล่าสุดจาก Google API อัตโนมัติ — ไม่ hardcode รุ่นเก่าในโค้ดฟีเจอร์

### อัปเดตอัตโนมัติ + รายงานแอดมิน

```bash
cd Solo-Code
npm run gemini:sync          # เช็ค API → อัปเดต config ถ้ามีรุ่นใหม่
npm run gemini:sync -- --dry-run
```

- สคริปต์: `scripts/sync-gemini-models.mjs`
- Mirror ไป Edge Functions: `supabase/functions/_shared/gemini-models.json`
- Changelog: [gemini-models-changelog.md](./gemini-models-changelog.md)
- แอดมิน: **Admin → AI Monitor** แสดง model ปัจจุบัน + แจ้งเตือนเมื่อมีการอัปเดตล่าสุด
- CI: `.github/workflows/gemini-models-sync.yml` (รายสัปดาห์ — เปิด PR ถ้ามีการเปลี่ยน)

Override ด้วย env ได้ตลอด (ไม่แตะไฟล์ config):

| Variable | Slot |
|----------|------|
| `GEMINI_MODEL_FAST` | fast |
| `GEMINI_MODEL` | default |
| `GEMINI_MODEL_VISION` | vision |
| `GEMINI_EMBEDDING_MODEL` | embedding |

## Environment variables

| Variable | ที่ตั้ง | ค่าเริ่มต้น |
|----------|---------|-------------|
| `GEMINI_API_KEY` | Server (TanStack) + Supabase Edge secrets | — (required) |
| `GEMINI_MODEL_FAST` | optional | จาก config → `gemini-3.1-flash-lite` |
| `GEMINI_MODEL` | optional | จาก config → `gemini-3.5-flash` |
| `GEMINI_MODEL_VISION` | optional | จาก config → `gemini-3.5-flash` |

สร้าง API key ที่ [Google AI Studio](https://aistudio.google.com/apikey)

## Supabase Edge Functions

ตั้ง secret บนโปรเจกต์ Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
# optional overrides (ปกติไม่ต้องตั้ง — ใช้ gemini-models.json ใน deploy)
```

Deploy functions:

```bash
supabase functions deploy ai-design-chat ai-price-suggest color-mentor planner-ai-assist \
  anthem-assistant ecosystem-ai-usage \
  --project-ref zkflkpbmbozrchqncpzi
```

## ฟีเจอร์ที่เรียก Gemini

| ฟีเจอร์ | ที่รัน | Model slot |
|---------|--------|------------|
| So1o Mentor chat (landing / FAB / creative partner) | `ai-design-chat` | fast |
| Price Guide reasoning | `ai-price-suggest` | fast |
| Color Lab | `color-mentor` | fast |
| Content Planner captions/hashtags | `planner-ai-assist` | fast |
| an1hem AI assistant FAB | `anthem-assistant` | fast |
| Shared ecosystem AI credits | `ecosystem-ai-usage` | fast |
| Brief extract / mood board | `aiBriefExtract`, `aiBriefFromImages` | vision |
| **WHT 50ทวิ scan** | `whtGeminiScan` (server) | **vision** |
| Admin HQ agents / AI sandbox | `hq.functions`, `aiSandbox.functions` | default / fast |
| Daily trends | `dailyTrends.functions` | fast |

## Legacy model names

คอลัมน์ `hq_agents.model` อาจยังเก็บชื่อแบบ `google/gemini-3.1-flash-lite-preview` หรือ `gemini-1.5-*` — โค้ดจะ map ผ่าน `aliases` ใน `config/gemini-models.json` อัตโนมัติ

## สิ่งที่ยังใช้ Lovable (ไม่ใช่ AI)

- Email (`/lovable/email/*`) — `LOVABLE_API_KEY` — ดู [ecosystem-notifications.md](../../docs/ecosystem-notifications.md)
- Google Sheets connector — `LOVABLE_API_KEY`

## Stripe (ไม่ใช่ Gemini)

ใช้ Stripe API ตรงเมื่อ `STRIPE_USE_DIRECT=true` — ดู [stripe.md](./stripe.md)

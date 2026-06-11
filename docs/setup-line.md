# LINE + LIFF — @solofreelancer

โค้ดพร้อมแล้ว: หน้า `/line-link`, OAuth, LIFF, edge `line-connect`, Settings ทั้ง So1o + Anthem

---

## สรุป: ใครทำอะไร

| สถานะ | งาน |
|--------|-----|
| ✅ โค้ดทำแล้ว | หน้าเชื่อม LINE, OAuth flow, บันทึก `profiles.line_messaging_user_id`, UI Settings |
| 🔧 **คุณทำใน LINE Console** | Callback URL, LIFF app, Channel access token |
| 🔧 **คุณทำบนเซิร์ฟเวอร์** | ใส่ secrets + deploy (สคริปต์ช่วยได้) |
| 🔧 **คุณทดสอบ** | เชื่อมบัญชี → เปิดแจ้งเตือน → ลอง hire / slip |

---

## ทำไมหา Callback URL ไม่เจอ?

ช่อง **2010369565** ของ @solofreelancer น่าจะเป็นช่องประเภท **Messaging API** — แท็บจะเป็นแบบนี้:

- Basic settings
- **Messaging API** (Webhook URL อยู่ตรงนี้ — ไม่ใช่ Callback)
- LIFF (ถ้ามี)
- ไม่มีแท็บ **LINE Login** → **ไม่มีช่อง Callback URL**

**Callback URL อยู่เฉพาะช่องประเภท LINE Login** — ต้องสร้างช่องใหม่แยก (Provider เดียวกับ OA)

### สร้างช่อง LINE Login (ครั้งเดียว)

1. เปิด [developers.line.biz/console](https://developers.line.biz/console/)
2. เลือก **Provider** เดียวกับ @solofreelancer
3. กด **Create a new channel** → เลือก **LINE Login** (ไม่ใช่ Messaging API)
4. กรอกฟอร์ม:
   - Channel name: `So1o LINE Login` (ห้ามมีคำว่า LINE ในชื่อ — ใช้ So1o Login ก็ได้)
   - App types: **Web app** ✅
   - Region: Thailand
5. สร้างเสร็จ → เปิดช่องใหม่

### ผูก OA กับช่อง Login

ช่อง LINE Login → แท็บ **Basic settings** → **Linked LINE Official Account** → เลือก **@solofreelancer**

### ใส่ Callback URL (ช่อง LINE Login เท่านั้น)

ช่อง **LINE Login ที่สร้างใหม่** → แท็บ **LINE Login** → **Callback URL** → Edit → วางทีละบรรทัด:

```
https://www.solofreelancer.com/line-link
https://solofreelancer.com/line-link
http://localhost:3000/line-link
```

กด **Update**

> ถ้ายังไม่เห็นแท็บ LINE Login = เปิดผิดช่อง (ยังเป็นช่อง Messaging API)

### Channel ID คนละตัว — สำคัญ

| ใช้ทำอะไร | เอาจากช่องไหน | ใส่ env ชื่ออะไร |
|-----------|---------------|------------------|
| ล็อกอิน OAuth / LIFF | **LINE Login** (ช่องใหม่) | `VITE_LINE_CHANNEL_ID` + `LINE_CHANNEL_SECRET` |
| ส่ง Push แจ้งเตือน | **Messaging API** (2010369565) | `LINE_CHANNEL_ACCESS_TOKEN` |

คัดลอก **Channel ID + Secret จากช่อง LINE Login ใหม่** (ไม่ใช่ 2010369565) ไปใส่ `.env.line`

---

## ขั้นที่ 1 — LINE Developers Console (คุณทำเอง ~10 นาที)

### 1.1 Callback URL (ช่อง LINE Login — ดูด้านบน)

แท็บ **LINE Login** ของช่อง Login → **Callback URL** → เพิ่มทั้งหมด:

```
https://www.solofreelancer.com/line-link
https://solofreelancer.com/line-link
http://localhost:3000/line-link
```

กด **Update** / Save

### 1.2 Channel access token (ช่อง Messaging API เดิม 2010369565)

เปิดช่อง **Messaging API** @solofreelancer → แท็บ **Messaging API** → **Channel access token** → **Issue** (long-lived)

คัดลอก token → ใส่ `LINE_CHANNEL_ACCESS_TOKEN` (ส่ง Push — คนละช่องกับ Login)

### 1.2b Webhook URL (AI Assistant ใน LINE — ใช้เครดิตร่วมกับ Assistant บนเว็บ)

ช่อง **Messaging API** → แท็บ **Messaging API** → **Webhook settings**:

| ช่อง | ค่า |
|------|-----|
| Webhook URL | `https://rvnzjiskqliexysicfmh.supabase.co/functions/v1/line-webhook` |
| Use webhook | **Enabled** |

คัดลอก **Channel secret** จากแท็บ **Basic settings** ของช่อง Messaging API (ไม่ใช่ช่อง Login) → ใส่ `LINE_MESSAGING_CHANNEL_SECRET` ใน Supabase secrets

**การใช้งาน:** พิมพ์คำถามในแชท @solofreelancer → หักเครดิต `ai_assistant_mentor` / `ai_assistant_business` จาก pool เดียวกับ So1o Assistant บนเว็บ · พิมพ์ `ทีมงาน` เพื่อส่งตั๋วให้แอดมิน

**ต้องมี `GEMINI_API_KEY` บน Supabase** (ไม่ใช่ค่าว่าง):

```bash
# ใส่ใน Solo-Code/.env ก่อน
GEMINI_API_KEY=your_google_ai_studio_key

cd Solo-Code && source .env
npx supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY" --project-ref rvnzjiskqliexysicfmh
```

ทดสอบ push ตรงไป LINE (ไม่ผ่าน webhook):

```bash
node scripts/line-ai-test.mjs
```

### 1.3 LIFF app (แนะนำ — ไม่บังคับแต่เปิดใน LINE ลื่นกว่า)

แท็บ **LIFF** → **Add** → ตั้งค่า:

| ช่อง | ค่า |
|------|-----|
| LIFF app name | So1o LINE Link |
| Size | Full |
| Endpoint URL | `https://www.solofreelancer.com/line-link` |
| Scope | profile, openid |
| Bot link feature | On (Aggressive) |

สร้างเสร็จ → คัดลอก **LIFF ID** (รูปแบบ `1234567890-AbCdEfGh`)

### 1.4 Channel Secret (ถ้ายังไม่มี / หมุนใหม่)

แท็บ **Basic settings** → **Channel secret** → คัดลอก  
⚠️ อย่า commit ลง git — ใส่เฉพาะ Supabase secrets

---

## ขั้นที่ 2 — Deploy บน Supabase (คุณรันคำสั่ง)

### วิธี A — สคริปต์ (แนะนำ)

```bash
# 1) สร้างไฟล์ secrets (ห้าม commit)
cat > Solo-Code/.env.line <<'EOF'
LINE_CHANNEL_ID=2010369565
LINE_CHANNEL_SECRET=ใส่จากขั้น 1.4
LINE_CHANNEL_ACCESS_TOKEN=ใส่จากขั้น 1.2
VITE_LINE_LIFF_ID=ใส่จากขั้น 1.3 หรือเว้นว่าง
EOF

# 2) ล็อกอิน Supabase CLI ครั้งแรก (ถ้ายังไม่เคย)
supabase login

# 3) รันสคริปต์
./scripts/setup-line.sh
```

สคริปต์จะ: ตั้ง secrets → deploy `line-connect`, `line-queue-process`, `notify-hire-request` → เติม `VITE_LINE_CHANNEL_ID` ใน `.env`

### วิธี B — มือ

```bash
cd Solo-Code
supabase secrets set \
  LINE_CHANNEL_ID=2010369565 \
  LINE_CHANNEL_SECRET='...' \
  LINE_CHANNEL_ACCESS_TOKEN='...' \
  --project-ref rvnzjiskqliexysicfmh

supabase functions deploy line-connect line-queue-process notify-hire-request \
  --project-ref rvnzjiskqliexysicfmh
```

### Client env (production build / Docker)

เพิ่มใน env ที่ deploy So1o:

```
VITE_LINE_CHANNEL_ID=2010369565
VITE_LINE_LIFF_ID=...   # ถ้ามีจากขั้น 1.3
```

Rebuild + redeploy So1o หลังเพิ่ม env

---

## ขั้นที่ 3 — ทดสอบ (คุณทำเอง)

1. เปิด `https://www.solofreelancer.com/line-link` (หรือ localhost dev)
2. **เข้าสู่ระบบ So1o** ก่อน
3. กด **เชื่อมด้วย LINE** → ล็อกอิน LINE → อนุญาต
4. **เพิ่มเพื่อน** `@solofreelancer` ถ้ายังไม่ได้เพิ่น
5. So1o → Settings → แจ้งเตือน LINE → เปิดสวิตช์ + เลือกประเภท (เช่น คำขอจ้าง Anthem)
6. ทดสอบ Push: สร้างคำขอจ้างจาก Anthem → ควรได้ Push (ต้องมี cron เรียก `line-queue-process`)

Anthem ใช้ลิงก์เดียวกันไป So1o `/line-link` — บัญชีเดียว

---

## Troubleshooting

| อาการ | แก้ |
|--------|-----|
| `line_token_exchange_failed` | Callback URL ใน LINE Console ไม่ตรงกับ URL จริง |
| `LINE_CHANNEL_SECRET not configured` | ยังไม่รัน `supabase secrets set` |
| เชื่อมได้แต่ไม่ได้ Push | ยังไม่มี `LINE_CHANNEL_ACCESS_TOKEN` หรือยังไม่เพิ่มเพื่อน OA |
| หน้า 404 `/line-link` | rebuild So1o หลัง pull (route อยู่ใน `routeTree.gen.ts` แล้ว) |

---

## อ้างอิงโค้ด

- หน้าเชื่อม: `Solo-Code/src/components/line/LineLinkScreen.tsx`
- Edge: `Solo-Code/supabase/functions/line-connect/`
- สคริปต์ deploy: `scripts/setup-line.sh`

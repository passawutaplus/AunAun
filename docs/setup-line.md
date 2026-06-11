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

## ขั้นที่ 1 — LINE Developers Console (คุณทำเอง ~10 นาที)

เข้า [developers.line.biz](https://developers.line.biz/) → ช่อง **@solofreelancer** (Channel ID `2010369565`)

### 1.1 LINE Login → Callback URL

แท็บ **LINE Login** → **Callback URL** → เพิ่มทั้งหมด:

```
https://www.solofreelancer.com/line-link
https://solofreelancer.com/line-link
http://localhost:3000/line-link
```

กด **Update** / Save

### 1.2 Messaging API → Channel access token

แท็บ **Messaging API** → **Channel access token** → **Issue** (long-lived)

คัดลอก token ไว้ → ใส่ในขั้นที่ 2 ชื่อ `LINE_CHANNEL_ACCESS_TOKEN`  
(ใช้ส่ง Push แจ้งเตือนจริง)

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

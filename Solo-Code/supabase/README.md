# Supabase — So1o (unified ecosystem)

โปรเจกต์ที่ใช้งาน: **`zkflkpbmbozrchqncpzi`** (supabase-blue-park) — ใช้ร่วมกับ an1hem + Ops Hub

| ไฟล์ / โฟลเดอร์ | หน้าที่ |
|-----------------|--------|
| `config.toml` | project ref + JWT policy ต่อ Edge Function |
| `migrations/` | schema ทั้งหมด (**136 ไฟล์**) — อย่าแก้ไฟล์เก่าที่รันแล้ว |
| `functions/` | Edge Functions (AI, notify, LINE, ecosystem) |
| `manual/` | SQL bundle สำหรับ SQL Editor (fallback) |
| `SCHEMA.md` | แผนที่ตารางตาม business domain |
| `MIGRATE.md` | ประวัติการย้ายโปรเจกต์ |
| `ECOSYSTEM.md` | unified schema + deploy checklist |
| `OAUTH.md` | Google OAuth + redirect URLs |

## คำสั่งหลัก

```bash
# ติดตั้ง CLI (ครั้งแรก)
./scripts/install-supabase-cli.sh

export SUPABASE_ACCESS_TOKEN=<จาก Dashboard → Account → Access Tokens>

# Push migration ใหม่
./scripts/supabase-push-via-api.sh

# Backup / restore status
./scripts/supabase-backup-status.sh   # org plan + scheduled backups
./scripts/supabase-backup.sh          # pg_dump → ../backups/db/
./scripts/install-backup-cron.sh      # crontab 03:00 daily
./scripts/supabase-storage-backup.sh  # Storage inventory / download

# ตั้งค่า Auth redirect + deploy Edge Functions (Gemini subset)
./scripts/supabase-setup-project.sh

# สร้าง SQL bundle ใหม่ (หลังเพิ่ม migration)
./scripts/bundle-migrations-sql.sh
```

## Edge Functions (20 ตัว)

### AI / Gemini

| Function | JWT (`config.toml`) | ใช้ทำอะไร |
|----------|---------------------|-----------|
| `ai-design-chat` | ปิด | แชทออกแบบ (landing) |
| `planner-ai-assist` | เปิด | ช่วย Planner |
| `ai-price-suggest` | เปิด | แนะนำราคา |
| `color-mentor` | เปิด | Color Lab |
| `anthem-assistant` | default เปิด | AI assistant บน an1hem |
| `anthem-portfolio-assist` | default เปิด | AI ช่วยลงผลงานจากรูป (8 เครดิต) |
| `ecosystem-ai-usage` | default เปิด | shared AI credits debit |

### Anthem / ecosystem

| Function | JWT | ใช้ทำอะไร |
|----------|-----|-----------|
| `embed-project` | ปิด | vector embed ผลงาน |
| `similar-images` | ปิด | ค้นหาภาพคล้าย |
| `generate-contract` | ปิด | สร้างสัญญา + debit credits |
| `sync-so1o-tier` | ปิด | legacy tier sync (unified project ไม่ต้องใช้) |
| `job-match-dispatch` | ปิด | แจ้ง job match (internal secret) |

### Notifications (Anthem email + LINE)

| Function | JWT | ใช้ทำอะไร |
|----------|-----|-----------|
| `notify-anthem` | default เปิด | gift, follow, job_application, topup, cashout |
| `notify-anthem-chat` | default เปิด | ข้อความแชทใหม่ |
| `notify-anthem-collab` | default เปิด | คำขอ collab |
| `notify-hire-request` | default เปิด | คำขอจ้างงาน |

### LINE

| Function | JWT | ใช้ทำอะไร |
|----------|-----|-----------|
| `line-connect` | ปิด | OAuth + บันทึก `line_messaging_user_id` |
| `line-webhook` | ปิด | inbound OA events + AI assistant |
| `line-queue-process` | ปิด | ส่ง LINE push จาก queue |
| `line-link-account` | ปิด | **deprecated** — ใช้ `line-connect` แทน |

> Functions ที่ไม่มี entry ใน `config.toml` ใช้ Supabase default `verify_jwt = true`

## Deploy groups

`supabase-setup-project.sh` deploy อัตโนมัติเฉพาะ Gemini subset (4 ตัว)

Deploy ชุด notify + LINE ด้วยตนเอง:

```bash
supabase functions deploy \
  notify-anthem notify-anthem-chat notify-anthem-collab notify-hire-request \
  job-match-dispatch \
  line-connect line-webhook line-queue-process \
  --project-ref zkflkpbmbozrchqncpzi
```

Deploy Anthem AI/ecosystem:

```bash
supabase functions deploy embed-project similar-images generate-contract \
  anthem-assistant anthem-portfolio-assist ecosystem-ai-usage admin-ai-monitor admin-supabase-usage ops-infra-monitor \
  --project-ref zkflkpbmbozrchqncpzi
```

## Portfolio AI assist (manual test)

1. Push migration `20260613120000_anthem_portfolio_from_images.sql` (registers `anthem_portfolio_from_images` = 8 credits)
2. Deploy `anthem-portfolio-assist` + ensure `GEMINI_API_KEY` is set
3. `/portfolio/new` → default โหมด **AI ช่วยลงผลงาน** → toggle แสดง **8 เครดิต**
4. อัปโหลด 2+ รูป → กด「ให้ AI ช่วยเติม」→ apply ผลลัพธ์
5. ลากเรียงภาพ (desktop) / จิ้มค้างลาก (mobile)
6. `/portfolio/:id/edit` → default โหมด **ลงธรรมดา**

## Secrets

| Secret | จำเป็น | ใช้กับ |
|--------|--------|--------|
| `GEMINI_API_KEY` | ใช่ (AI) | Gemini functions |
| `GEMINI_MODEL`, `GEMINI_MODEL_FAST` | optional | model override |
| `LOVABLE_API_KEY` | ใช่ (So1o email) | server email send |
| `RESEND_API_KEY` | ใช่ (Aplus1 email) | Resend — So1o server + edge notify-* |
| `APLUS1_EMAIL_FROM` | แนะนำ | `Aplus1 <noreply@aplus1.app>` |
| `APLUS1_EMAIL_SENDER_DOMAIN` | แนะนำ | `notify.aplus1.app` |
| `ANTHEM_APP_URL` | แนะนำ | notify templates (`https://aplus1.app`) |
| `LINE_CHANNEL_SECRET` | LINE Login | `line-connect` |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API | `line-queue-process` |
| `LINE_MESSAGING_CHANNEL_SECRET` | Messaging API | `line-webhook` |
| `JOB_MATCH_DISPATCH_SECRET` | job match | `job-match-dispatch` |
| `MGMT_ACCESS_TOKEN` | admin monitor | `admin-supabase-usage`, `ops-infra-monitor` (Personal Access Token — ห้ามใช้ prefix `SUPABASE_`) |
| `VERCEL_TOKEN` | optional | `ops-infra-monitor` — Vercel project status + billing |
| `VERCEL_TEAM_ID` | optional | `ops-infra-monitor` — team billing API |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` inject อัตโนมัติเมื่อ deploy

## ตรวจในแอป

an1hem: `/admin/supabase` — Supabase Usage (plan, DB, storage, API)

Ops Hub: `/monitor` — health probe + Supabase/Vercel usage + คำแนะนำ Pro (เรียก `ops-infra-monitor`)

## เอกสารที่เกี่ยวข้อง

- [ECOSYSTEM.md](./ECOSYSTEM.md) — schema layout
- [../../docs/ecosystem-notifications.md](../../docs/ecosystem-notifications.md) — email/LINE flows
- [../../docs/backup-restore.md](../../docs/backup-restore.md) — backup Pro + pg_dump
- [../docs/stripe.md](../docs/stripe.md) — Stripe webhooks

# Admin & Platform — สถานะ (อัปเดต 2026-06)

---

## ทำแล้วใน repo

| รายการ | หน้า / ไฟล์ |
|--------|-------------|
| Admin CRUD (users, projects, comments, collections, jobs) | `/admin/*` |
| มอนิเตอร์กิจกรรมทั้งเว็บ | `/admin/activity` |
| Dashboard KPI + แถบ "ต้องดูแล" | `/admin` |
| **platform_events** + DB triggers | migrations บน `rvnzjiskqliexysicfmh` |
| **สัญญา** | `/admin/contracts` |
| **กระเป๋า & Ledger** | `/admin/wallet` |
| **ใบสมัครงาน** | `/admin/applications` |
| **Analytics funnel / retention** | `/admin/analytics` |
| **Admin alerts** (toast + banner + badge sidebar) | report/cashout/KYC/AML |
| Notifications / Gifts / AML / KYC / Reports | โค้ดพร้อม |
| **Email notifications** | `notify-anthem*` edge + React Email templates |
| **LINE push** | `line-connect` + `line-queue-process` |
| **Stripe PX top-up + Connect cashout** | ดู [aml-compliance.md](./aml-compliance.md) |

---

## ต้อง push migration บน remote

โปรเจกต์ unified: **`rvnzjiskqliexysicfmh`**

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
cd Solo-Code && ./scripts/supabase-push-via-api.sh
# หรือจาก Anthem-Code:
npm run db:push
```

หลัง push:

```bash
npx supabase gen types typescript --project-id rvnzjiskqliexysicfmh > src/integrations/supabase/types.ts
```

---

## ยังไม่ทำ (เลื่อน)

| รายการ | เหตุผล |
|--------|--------|
| Admin แก้/ลบ สตูดิโอ, hiring, collab, แชต | ยังไม่มี RPC |
| Session / page views analytics | ต้อง consent + tracking SDK |
| **Slack webhook** นอกแอป | email + LINE + in-app ทำแล้ว — Slack ยังไม่ทำ |
| Realtime ครบทุก schema (`anthem.*`) | บาง subscription ยังชี้ `public` |

---

## สรุป

**Admin monitor ครบวงจรพร้อมใน repo — ใช้งานเต็มหลัง `db:push` + ตั้ง role admin**

Email/LINE notifications: [ecosystem-notifications.md](../../docs/ecosystem-notifications.md)

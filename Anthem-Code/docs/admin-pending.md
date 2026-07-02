# Admin & Platform — สถานะ (อัปเดต 2026-07-02)

---

## ทำแล้วใน repo + production

| รายการ | หน้า / ไฟล์ |
|--------|-------------|
| Admin CRUD (users, projects, comments, collections, jobs) | `/admin/*` |
| มอนิเตอร์กิจกรรมทั้งเว็บ | `/admin/activity` |
| Dashboard KPI + แถบ "ต้องดูแล" + ลิงก์จัดกลุ่ม 8 หมวด | `/admin` |
| **Admin navigation รวมศูนย์** | `src/lib/admin/adminNavigation.ts` + `AdminSidebar` |
| **Kuy Radar** (growth intel สำหรับ Aplus1) | `/admin/kuy-radar/*` — ดู [kuy-radar-migration.md](./kuy-radar-migration.md) |
| **platform_events** + DB triggers | migrations บน `zkflkpbmbozrchqncpzi` |
| **สัญญา** | `/admin/contracts` |
| **กระเป๋า & Ledger** | `/admin/wallet` |
| **ใบสมัครงาน** | `/admin/applications` |
| **Analytics funnel / retention** | `/admin/analytics` |
| **Admin alerts** (toast + banner + badge sidebar) | report/cashout/KYC/AML |
| Notifications / Gifts / AML / KYC / Reports | โค้ดพร้อม |
| **Email notifications** | `notify-anthem*` edge + React Email templates |
| **LINE push** | `line-connect` + `line-queue-process` |
| **Stripe PX top-up + Connect cashout** | ดู [aml-compliance.md](./aml-compliance.md) |

### หมวด sidebar (8 กลุ่ม)

1. ศูนย์บัญชาการ — ภาพรวม, Kuy Radar, Analytics, Dev tasks
2. ผู้ใช้ & สตูดิโอ
3. ผลงาน & ชุมชน
4. งาน & ความร่วมมือ
5. การเงิน & โปรโมต
6. การสื่อสาร
7. ความน่าเชื่อถือ & ความปลอดภัย
8. ระบบ & เทคนิค

---

## Migration บน remote

โปรเจกต์ unified: **`zkflkpbmbozrchqncpzi`**

- `20260702120000_kuy_radar_core` — **applied** 2026-07-02
- `20260702120000_qa_fix_production_schema` — applied ก่อนหน้า (version `20260702102131`)

```bash
./scripts/check-migrations-pending.sh
cd Solo-Code && ./scripts/supabase-push-via-api.sh
```

---

## ยังไม่ทำ (เลื่อน)

| รายการ | เหตุผล |
|--------|--------|
| Admin แก้/ลบ สตูดิโอ, hiring, collab, แชต | ยังไม่มี RPC |
| Session / page views analytics | ต้อง consent + tracking SDK |
| **Slack webhook** นอกแอป | email + LINE + in-app ทำแล้ว — Slack ยังไม่ทำ |
| Realtime ครบทุก schema (`anthem.*`) | บาง subscription ยังชี้ `public` |
| TypeScript strict / ESLint clean | ~753 type errors, ~92 lint errors (หนี้เดิม) |

---

## สรุป

**Admin monitor + Kuy Radar พร้อมใช้งาน production หลัง migration push (เสร็จแล้ว)**

Email/LINE notifications: [ecosystem-notifications.md](../../docs/ecosystem-notifications.md)

# Backup & Restore — Ecosystem (So1o + an1hem + Ops Hub)

อัปเดต: มิถุนายน 2569  
โปรเจกต์: **`zkflkpbmbozrchqncpzi`** (org **AunAun**) — Postgres + Auth + Storage ร่วมกันทั้ง ecosystem

---

## สรุปสั้น ๆ: ต้องซื้อ Pro ไหม?

| สิ่งที่ต้องการ | Free | Pro ($25/mo) |
|---|---|---|
| **Daily backup อัตโนมัติ** (Dashboard restore) | ไม่มี | มี (เก็บ 7 วัน) |
| **PITR** (restore ถึงวินาที) | ไม่มี | add-on |
| **Manual pg_dump** (สคริปต์ใน repo) | ได้ | ได้ (แนะนำเป็น safety net) |
| **Storage ไฟล์** | ต้อง backup เอง | ต้อง backup เอง (DB backup ไม่รวมไฟล์) |

**คำตอบ:** ถ้าต้องการ **backup อัตโนมัติจาก Supabase + restore ใน Dashboard** → **ต้องอัปเกรด Organization เป็น Pro**  
ถ้ายังอยู่ Free → ใช้ **`Solo-Code/scripts/supabase-backup.sh`** เป็น schedule (cron) แทน

ตรวจสถานะปัจจุบัน:

```bash
cd Solo-Code
./scripts/supabase-backup-status.sh
```

---

## สถานะที่ตรวจแล้ว (2026-06-13)

| รายการ | ค่า |
|---|---|
| Organization plan | **free** |
| Scheduled backups (API) | **0** รายการ |
| PITR | ปิด |
| Manual pg_dump ล่าสุด | `backups/db/zkflkpbmbozrchqncpzi-*.dump` (รันแล้ว) |

---

## ขั้นที่ 1 — อัปเกรด Pro (แนะนำ)

1. เปิด [Organization Billing — AunAun](https://supabase.com/dashboard/org/vercel_icfg_E9zROnVzGEWyepVIUbmVpVLz/billing)
2. เลือก **Pro Plan** ($25/mo ต่อ organization — ทุก project ใน org ได้ benefit)
3. ใส่ payment method + confirm
4. รอ **daily backup แรก** (มักภายใน 24 ชม.)
5. ตรวจที่ [Database → Backups](https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi/database/backups/scheduled)

> Pro รวม: 8 GB DB, 100 GB Storage, ไม่ pause project, daily backup 7 วัน — สอดคล้องกับ [`storageQuotas.ts`](../Solo-Code/src/lib/storageQuotas.ts)

**ไม่สามารถอัปเกรดผ่าน API ได้** — ต้องยืนยัน billing ใน Dashboard (Management API อ่าน plan/backups ได้อย่างเดียว)

---

## ขั้นที่ 2 — Manual database backup (Free หรือ Pro)

### คำสั่ง

```bash
cd Solo-Code
export SUPABASE_DB_PASSWORD='...'   # หรือใส่ใน .env
./scripts/supabase-backup.sh
```

ไฟล์ไปที่ `backups/db/zkflkpbmbozrchqncpzi-YYYYMMDD-HHMMSS.dump` (custom format, gzip ใน pg_dump -Fc)

### Cron ตัวอย่าง (รายวัน 03:00)

```bash
cd Solo-Code
./scripts/install-backup-cron.sh   # ติดตั้ง crontab อัตโนมัติ
# หรือ manual:
# 0 3 * * * /path/to/AunAun/Solo-Code/scripts/cron-supabase-backup.sh
```

Log: `logs/supabase-backup.log` (repo root)

เก็บ off-site: sync `backups/` ไป S3 / Google Drive (encrypted) / VPS อื่น

### Restore จาก pg_dump

```bash
# สร้าง staging project หรือ local Postgres ก่อน — อย่า restore ทับ production โดยไม่วางแผน downtime
pg_restore -d "postgresql://postgres:PASSWORD@HOST:5432/postgres" \
  --clean --if-exists backups/db/zkflkpbmbozrchqncpzi-YYYYMMDD-HHMMSS.dump
```

หรือใช้ Docker:

```bash
docker run --rm -i -e PGPASSWORD='...' postgres:17 \
  pg_restore -d "postgresql://postgres.zkflkpbmbozrchqncpzi:...@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  --clean --if-exists < backups/db/....dump
```

---

## ขั้นที่ 3 — Restore จาก Supabase Dashboard (หลัง Pro)

1. [Database → Backups → Scheduled](https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi/database/backups/scheduled)
2. เลือก snapshot ที่ต้องการ → **Restore**
3. **Project จะ offline** ระหว่าง restore — วาง downtime ล่วงหน้า
4. หลัง restore: ตรวจ Auth URLs, Edge Function secrets, Realtime subscriptions

List backups ผ่าน API:

```bash
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/zkflkpbmbozrchqncpzi/database/backups"
```

---

## ขั้นที่ 4 — Storage backup (แยกจาก DB)

Daily backup ของ Postgres **ไม่รวมไฟล์ใน Storage** (bucket `project-media`, `brand-logos`, …)

```bash
cd Solo-Code
export SUPABASE_SERVICE_ROLE_KEY='...'
./scripts/supabase-storage-backup.sh          # นับ object
./scripts/supabase-storage-backup.sh download # ดาวน์โหลดทั้งหมด (ช้า — ใช้ schedule รายสัปดาห์)
```

Buckets ที่ครอบคลุม: So1o `USER_STORAGE_BUCKETS` + Anthem `project-media`

---

## ขั้นที่ 5 — ทดสอบ restore (ทำครั้งเดียวก่อน launch)

Checklist จาก [`scale-readiness-checklist.md`](./scale-readiness-checklist.md):

- [ ] สร้าง **staging project** (optional แต่แนะนำ)
- [ ] Restore backup ลง staging
- [ ] Login So1o + an1hem ด้วย test account
- [ ] ตรวจ wallet, feed, chat, notifications
- [ ] บันทึกเวลา restore + ขนาด DB

---

## สิ่งที่ backup ไม่ครอบคลุม

| รายการ | วิธีเก็บ |
|---|---|
| Edge Function **secrets** | Dashboard → Edge Functions → Secrets / `supabase secrets list` |
| Vercel / VPS **env** | password manager + `.env.example` |
| **Stripe** webhooks keys | Stripe Dashboard |
| **Migrations** (schema) | git `Solo-Code/supabase/migrations/` |

---

## สคริปต์ใน repo

| สคริปต์ | หน้าที่ |
|---|---|
| `Solo-Code/scripts/supabase-backup-status.sh` | ดู org plan + จำนวน scheduled backup |
| `Solo-Code/scripts/supabase-backup.sh` | pg_dump logical backup |
| `Solo-Code/scripts/cron-supabase-backup.sh` | cron entrypoint + log |
| `Solo-Code/scripts/install-backup-cron.sh` | `crontab` 03:00 daily |
| `Solo-Code/scripts/supabase-storage-backup.sh` | inventory / download Storage |

---

## เอกสารที่เกี่ยวข้อง

- [ecosystem-hosting.md](./ecosystem-hosting.md) — SPOF + runbook
- [scale-readiness-checklist.md](./scale-readiness-checklist.md) — §2.1 Supabase Plan
- [Supabase: Database Backups](https://supabase.com/docs/guides/platform/backups)

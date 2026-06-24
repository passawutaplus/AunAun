# รัน migration บน remote ด้วยมือ (fallback)

โปรเจกต์ unified: **`rvnzjiskqliexysicfmh`**

เปิด [SQL Editor](https://supabase.com/dashboard/project/rvnzjiskqliexysicfmh/sql/new)

> **แนะนำ:** ใช้ `cd Solo-Code && ./scripts/supabase-push-via-api.sh` เป็นหลัก — ไฟล์นี้สำหรับกรณี CLI ใช้ไม่ได้

## Canonical migration path

Migrations ทั้งหมดอยู่ที่ `Solo-Code/supabase/migrations/` (136 ไฟล์)

Anthem-specific SQL bundles (รันใน SQL Editor ถ้าจำเป็น):

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `Solo-Code/supabase/manual/apply-anthem-ecosystem.sql` | ตาราง anthem ทั้งชุด (ครั้งเดียว) |
| `scripts/ecosystem/ecosystem-phase1.sql` | ecosystem links, tier, storage |
| `scripts/ecosystem/inhouse-workspace.sql` | In-House MVP |
| `scripts/ecosystem/stripe-payments.sql` | PX wallet + Stripe RPCs |
| `scripts/ecosystem/seed-catalog.sql` | seed demo community |

## Seed demo

```bash
cd Anthem-Code
npm run seed:demo
# หรือ
node scripts/run-seed.mjs
```

## ตั้ง admin

รัน `grant-admin-role.sql` หลังแก้ `YOUR_USER_UUID`

## หลังรัน SQL

```bash
cd Solo-Code
npx supabase gen types typescript --project-id rvnzjiskqliexysicfmh > ../Anthem-Code/src/integrations/supabase/types.ts
```

## โปรเจกต์เก่า (ปิดแล้ว)

`uutbvwyoivqojozrangi` — อย่าใช้

# ย้ายโปรเจกต์ Supabase → rvnzjiskqliexysicfmh

โปรเจกต์ใหม่: **supabase-blue-park** (`rvnzjiskqliexysicfmh`)

## สิ่งที่ทำแล้ว

- [x] `supabase/config.toml` → `rvnzjiskqliexysicfmh`
- [x] `.env` → URL + anon key + service_role key ใหม่
- [x] CLI link โปรเจกต์ใหม่แล้ว
- [x] **Schema ทั้งหมด** — push ครบ 136 migrations แล้ว (ผ่าน `scripts/supabase-push-via-api.sh`)

## Push migrations ครั้งถัดไป

```bash
export SUPABASE_ACCESS_TOKEN=<token จาก Account → Access Tokens>
./scripts/supabase-push-via-api.sh
```

ทางเลือก (ต้องมี Database password): `./scripts/supabase-push-pipeline.sh`

หรือวาง `supabase/manual/apply-all-migrations.sql` ใน [SQL Editor](https://supabase.com/dashboard/project/rvnzjiskqliexysicfmh/sql/new)

## หลัง schema ขึ้นแล้ว

```bash
export SUPABASE_ACCESS_TOKEN=<token>
./scripts/supabase-setup-project.sh   # auth redirect URLs
npm run dev
```

เช็ค: `/admin` → **Supabase** → migrations ควรเป็น **ขึ้นแล้ว**

## สิ่งที่ต้องทำเอง (ไม่มีใน repo)

| รายการ | ทำที่ไหน |
|--------|----------|
| Revoke access token เก่า | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| ตั้ง `GEMINI_API_KEY` | Dashboard → Edge Functions → Secrets |
| สมัคร admin คนแรก | แอป → สมัคร แล้วเพิ่ม role ใน `user_roles` หรือ SQL |
| OAuth (Google/Apple) | Dashboard → Auth → Providers |
| ย้ายข้อมูลจากโปรเจกต์เก่า | ไม่ได้ทำอัตโนมัติ — export/import เองถ้าต้องการ |

โปรเจกต์เก่า `jdqrrzaleapablabphmw` ไม่ใช้แล้ว

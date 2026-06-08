# Ecosystem setup (So1o + an1hem)

## Quick start

```bash
node scripts/ecosystem/setup.mjs
```

Then apply SQL on Supabase (see below) and deploy apps per `docs/deploy-vps.md`.

## How Pro works (unified project `rvnzjiskqliexysicfmh`)

1. User pays on **So1o** → webhook updates `public.profiles.subscription_tier`
2. an1hem reads the same row via `user_id` — no cross-project sync
3. Legacy `sync-so1o-tier` only if an1hem still used a separate project

## SQL files

| File | Project |
|------|---------|
| `anthem-migration.sql` | เก่า — ใช้ `Solo-Code/supabase/manual/apply-anthem-ecosystem.sql` แทน |
| `solo-migration.sql` | เก่า — รวมใน migrations So1o แล้ว |
| `seed-catalog.sql` | an1hem — auth.users + profiles + projects + studios + jobs |

หลังรัน `seed-catalog.sql` ฟีด/ดีไซเนอร์/สตูดิโอ/งานจะดึงจาก Supabase เท่านั้น (ไม่มี mock ฝั่ง client แล้ว)

### รัน seed บน an1hem

1. Supabase Dashboard → **SQL Editor** → วาง `seed-catalog.sql` → Run (idempotent)
2. ตรวจ: `SELECT count(*) FROM projects WHERE status = 'Published';` ควรได้ ~20

หรือใส่ **service_role JWT** ใน `scripts/ecosystem/.env.seed.local` แล้ว:

```bash
cd Anthem-Code && node scripts/run-seed.mjs
```

## Long term

Merge both apps onto one Supabase project — see `docs/ecosystem-unified-account.md`.

# Deploy So1o + an1hem on a VPS (Docker Compose)

โฮสต์เองบน VPS — **ไม่ใช้ Lovable** สำหรับ frontend/backend ของแอป

## สถาปัตยกรรม

| Service | รูปแบบ | พอร์ตภายใน |
|---------|--------|------------|
| **proxy** | nginx reverse proxy | 80 (public) |
| **solo** | Node SSR (TanStack Start) | 3000 |
| **anthem** | nginx + static Vite SPA | 80 |
| **ops-hub** | nginx + static Ops Hub SPA | 80 |

Supabase โปรเจกต์เดียว **`rvnzjiskqliexysicfmh`** — ดู `Solo-Code/supabase/ECOSYSTEM.md`

## ความต้องการ

- VPS (Ubuntu 22.04+ แนะนำ), Docker Engine + Compose v2
- โดเมน (แนะนำ): `solofreelancer.com`, `an1hem.app`, `hq.solofreelancer.com`
- โปรเจกต์ Supabase + Stripe + Gemini API keys

## ตั้งค่าครั้งแรก

```bash
cd /path/to/AunAun

# 1) ตัวแปรสำหรับ compose (build args + runtime)
cp .env.vps.example .env
# แก้ค่าให้ครบ แล้ว sync ไปที่ Solo-Code/.env และ Anthem-Code/.env สำหรับ dev

# 2) nginx — แก้ server_name ให้ตรงโดเมนจริง
nano deploy/nginx/default.conf

# 3) Supabase Dashboard → Authentication → URL Configuration
#    Site URL + Redirect URLs ต้องรวม:
#    https://solo.yourdomain.com/**
#    https://anthem.yourdomain.com/**
#    https://hq.solofreelancer.com/**
#    และเปิด Google OAuth provider

# 4) Build & run
docker compose up --build -d
docker compose ps
```

## HTTPS (แนะนำ)

ใส่ **Caddy** หรือ **certbot** หน้า nginx หรือแทนที่ `proxy` ด้วย Caddy ที่ออกใบรับรอง Let's Encrypt อัตโนมัติ

ตัวอย่าง: เปิดพอร์ต 443 บน proxy + volume ใบรับรอง (ขึ้นกับเครื่องมือที่เลือก)

## Edge Functions (an1hem AI)

ฟังก์ชัน `embed-project`, `similar-images`, `generate-contract` ใช้ **GEMINI_API_KEY** (ไม่ใช้ Lovable gateway แล้ว)

```bash
cd Anthem-Code
supabase link --project-ref YOUR_ANTHEM_REF
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy embed-project similar-images generate-contract sync-so1o-tier
```

## Seed ข้อมูลชุมชน

รัน SQL บนโปรเจกต์ an1hem (Supabase SQL Editor หรือ `psql`):

`scripts/ecosystem/seed-catalog.sql`

หรือจากเครื่องที่มี **service_role JWT**:

```bash
cd Anthem-Code && node scripts/run-seed.mjs
```

## อัปเดตเวอร์ชัน

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

## หมายเหตุ

- **Stripe**: ตั้ง `STRIPE_USE_DIRECT=true` และ webhook URL ชี้ไป `https://solo.yourdomain.com/api/public/payments/webhook`
- **Solo dev ในเครื่อง**: ยังใช้ `@lovable.dev/vite-tanstack-config` ได้ — production Docker ใช้ `vite.docker.config.ts` อยู่แล้ว
- **อีเมล Lovable** (`Solo-Code/src/routes/lovable/email/*`): legacy — ย้ายไปผู้ให้บริการอีเมลอื่นหรือปิด route ถ้าไม่ใช้

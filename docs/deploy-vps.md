# Deploy So1o + Aplus1 on a VPS (Docker Compose)

โฮสต์เองบน VPS — **ไม่ใช้ Lovable** สำหรับ frontend/backend ของแอป

## สถาปัตยกรรม

| Service | รูปแบบ | พอร์ตภายใน |
|---------|--------|------------|
| **proxy** | nginx reverse proxy | 80 (public) |
| **solo** | Node SSR (TanStack Start) | 3000 |
| **anthem** | nginx + static Vite SPA | 80 |
| **ops-hub** | nginx + static Ops Hub SPA | 80 |

Supabase โปรเจกต์เดียว **`zkflkpbmbozrchqncpzi`** — ดู `Solo-Code/supabase/ECOSYSTEM.md`

## ความต้องการ

- VPS (Ubuntu 22.04+ แนะนำ), Docker Engine + Compose v2
- โดเมน (แนะนำ): `solofreelancer.com`, `aplus1.app`, `hq.solofreelancer.com`
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
sudo ./scripts/setup-vps-firewall.sh   # optional — ufw 22/80/443 only
docker compose up --build -d
docker compose ps
```

## Deploy เร็ว (สคริปต์)

```bash
cp .env.vps.example .env   # แก้ keys + URLs
chmod +x scripts/*.sh

# HTTP (ทดสอบบน VPS)
./scripts/deploy-ecosystem.sh

# HTTPS + Let's Encrypt (แชร์ให้ UX reviewer — ต้องตั้ง DNS ก่อน)
./scripts/deploy-ecosystem.sh --https
```

DNS ที่ต้องชี้มา VPS:

```
solofreelancer.com, www.solofreelancer.com
aplus1.app, www.aplus1.app
hq.solofreelancer.com
```

## HTTPS (Caddy)

ใช้ `docker-compose.https.yml` + [deploy/caddy/Caddyfile](../deploy/caddy/Caddyfile) — Caddy รับ 80/443 แล้วส่งต่อ nginx `proxy` (route ตาม Host)

```bash
./scripts/deploy-ecosystem.sh --https
```

OAuth / Google login **ต้องการ HTTPS** บน production

## Firewall & security headers

Production ใช้ **Vercel** — ดู [`firewall.md`](./firewall.md)

VPS self-host:

- `scripts/setup-vps-firewall.sh` — UFW baseline
- `deploy/nginx/security-headers.conf` — HSTS, Permissions-Policy, X-Frame-Options
- `limit_req` บน So1o `/api/` ใน `deploy/nginx/default.conf`

## SEO หลัง Deploy

Checklist เต็ม: [`Solo-Code/docs/seo-deploy.md`](../Solo-Code/docs/seo-deploy.md)

1. ตั้ง `VITE_SITE_URL=https://solofreelancer.com` ใน `.env`
2. ตรวจ `https://solofreelancer.com/robots.txt` และ `/sitemap.xml`
3. Google Search Console → submit sitemap
4. ทดสอบ OG preview หน้า `/` และ `/pricing`

## Demo สำหรับ UX reviewer

```bash
./scripts/prepare-demo.sh    # Auth URLs + ops migration + seed 50 creators
```

ส่งลิงก์ + คู่มือ: [demo-pack.md](demo-pack.md)

## Edge Functions (unified project)

ฟังก์ชัน AI + notify + LINE อยู่ที่ `Solo-Code/supabase/functions/` บนโปรเจกต์ **`zkflkpbmbozrchqncpzi`**

```bash
cd Solo-Code
export SUPABASE_ACCESS_TOKEN=sbp_...
supabase secrets set GEMINI_API_KEY=... ANTHEM_APP_URL=https://aplus1.app
supabase functions deploy embed-project similar-images generate-contract \
  notify-anthem notify-anthem-chat notify-anthem-collab notify-hire-request \
  line-connect line-webhook line-queue-process \
  --project-ref zkflkpbmbozrchqncpzi
```

> `sync-so1o-tier` เป็น legacy — ไม่ต้อง deploy เมื่อใช้ unified project

## Seed ข้อมูลชุมชน

รัน SQL บน unified Supabase project (Supabase SQL Editor หรือ `psql`):

`scripts/ecosystem/seed-catalog.sql`

หรือจากเครื่องที่มี **service_role JWT**:

```bash
cd Anthem-Code && node scripts/run-seed.mjs
```

## แยกความล้มเหลว (failure isolation)

Proxy **ไม่รอ** healthcheck ทั้ง 3 แอป — แอปใดล่มได้ 502 เฉพาะโดเมนนั้น (`deploy/nginx/502.html`)

Restart แอปเดียว:

```bash
docker compose up -d --no-deps anthem
docker compose up -d --no-deps solo
docker compose up -d --no-deps ops-hub
```

Deploy แยก host (Aplus1 / Ops Hub ไม่พึ่ง So1o container):

```bash
cp anthem.env.example .env && ./scripts/deploy-anthem-production.sh
cp ops-hub.env.example .env && ./scripts/deploy-ops-hub-production.sh
```

รายละเอียด topology + DNS + runbook: [ecosystem-hosting.md](ecosystem-hosting.md)

Health check (cron / manual):

```bash
./scripts/health-check.sh
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

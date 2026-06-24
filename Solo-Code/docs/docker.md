# Docker

รัน So1o Freelancer ใน container แบบ **Node SSR** (production บน VPS ใช้ `docker-compose.yml` ที่ root ของ monorepo — ดู `docs/deploy-vps.md`)

## ความต้องการ

- Docker + Docker Compose v2
- ไฟล์ `.env` ที่ root (คัดจาก `.env.example`)

## Production (แนะนำ)

```bash
# build + run
docker compose up --build

# เปิด http://localhost:3000
```

ตัวแปร `VITE_*` ถูก bake ตอน build — แก้ `.env` แล้ว build ใหม่:

```bash
docker compose build --no-cache app
docker compose up app
```

## Dev ใน container (optional)

```bash
docker compose --profile dev up dev
# → http://localhost:8080
```

ใช้ Bun ตามที่โปรเจกต์แนะนำใน `docs/qa-onboarding.md`

## สคริปต์ local (ไม่ใช้ Docker)

```bash
npm run build          # same config as Docker (vite.docker.config.ts)
npm run start:docker   # serve dist/server on :3000
```

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|------|--------|
| `Dockerfile` | multi-stage: install → `build:docker` → Node runner |
| `docker-compose.yml` | service `app` (+ `dev` profile) |
| `vite.docker.config.ts` | build สำหรับ Node (ปิด Cloudflare plugin) |
| `scripts/docker-serve.mjs` | HTTP server จาก `dist/server/server.js` |

## หมายเหตุ

- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, Stripe) อ่านตอน runtime ผ่าน `process.env` — ส่งผ่าน `environment` ใน compose ได้
- Healthcheck: `GET /` ทุก 30 วินาที

## Troubleshooting: build ล้มด้วย `JavaScript heap out of memory`

ขั้น SSR ของ Vite (`building ssr environment`) ใช้ RAM สูงมาก บน droplet **1 GB** มักไม่พอแม้ client build จะผ่านแล้ว

**วิธีที่ 1 — เพิ่ม swap บน VPS (แนะนำถ้ายัง build บนเครื่อง)**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # ควรเห็น Swap > 0
cd ~/Solo-Code && docker compose build --no-cache app && docker compose up -d
```

**วิธีที่ 2 — build ที่เครื่อง RAM มากกว่า แล้วส่ง image ขึ้น server**

```bash
# บน laptop / CI
docker compose build app
docker save solo-code-app -o solo-code-app.tar
scp solo-code-app.tar root@YOUR_SERVER:~
# บน VPS
docker load -i solo-code-app.tar
docker compose up -d
```

**วิธีที่ 3 — อัปเกรด droplet เป็น 2 GB RAM** ถ้าไม่อยากพึ่ง swap

`Dockerfile` ตั้ง `NODE_OPTIONS=--max-old-space-size=2048` ใน stage build แล้ว — ยังต้องมี RAM+swap รวมพออย่างน้อย ~2.5 GB ช่วง build

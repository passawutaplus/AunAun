# Firewall & Edge Security

Production ใช้ **Vercel** เป็นหลัก (ไม่ใช้ Cloudflare) — ดู [`scripts/deploy-vercel.sh`](../scripts/deploy-vercel.sh)

| แอป | Production URL | Host |
|-----|----------------|------|
| **So1o** | https://solofreelancer.com | Vercel |
| **an1hem (1PX)** | https://an1hem.app | Vercel |
| **Ops Hub** | https://hq.solofreelancer.com | Vercel |
| **Demo** | `*-demo*.vercel.app` | Vercel preview |

VPS + Docker ยังเป็น **ทางเลือกสำรอง** สำหรับ self-host — ดู [`deploy-vps.md`](./deploy-vps.md)

---

## ชั้นป้องกัน (defense in depth)

```text
Internet
  │
  ├─ Vercel Edge (production)
  │    ├─ Platform DDoS mitigation (built-in)
  │    ├─ vercel.json security headers (So1o / an1hem / Ops Hub)
  │    └─ Optional: Vercel Firewall rules (Pro+) — Dashboard → Security
  │
  ├─ Application (So1o SSR)
  │    ├─ src/start.ts — CSP, HSTS, COOP, CORP, Permissions-Policy
  │    ├─ src/lib/rateLimit.server.ts — IP throttle บน public API
  │    ├─ cronAuth.server.ts — Bearer CRON_SECRET
  │    └─ Stripe webhook signature verify
  │
  ├─ Supabase
  │    ├─ RLS ทุกตาราง user data
  │    └─ Auth rate limit (built-in)
  │
  └─ VPS path (optional)
       ├─ scripts/setup-vps-firewall.sh — ufw 22/80/443
       ├─ deploy/nginx/security-headers.conf
       └─ nginx limit_req บน /api/ (solo host)
```

---

## Vercel (production)

### Platform

- **DDoS mitigation** — เปิดอัตโนมัติทุก deployment
- **TLS** — จัดการโดย Vercel; HSTS ซ้ำใน `vercel.json` + `start.ts`
- **Custom domain DNS** — So1o: A → `76.76.21.21` (ดู `cutover-solo-dns-vercel.sh`)

### Security headers (`vercel.json`)

| แอป | ไฟล์ | CSP |
|-----|------|-----|
| So1o | `Solo-Code/vercel.json` | ตั้งใน `src/start.ts` (dynamic) — edge ใส่ HSTS + COOP/CORP |
| an1hem | `Anthem-Code/vercel.json` | ครบที่ edge |
| Ops Hub | `Ops-Hub/vercel.json` | ครบที่ edge |

### Vercel Firewall (แนะนำเมื่อ scale)

Dashboard → Project → **Security** → Firewall:

- Rate limit `/api/*` (เช่น 100 req/min/IP)
- Challenge หรือ block bot traffic บน auth paths
- Geo block (ถ้าต้องการจำกัด region)

> ไม่ config ใน repo — ตั้งใน Vercel Dashboard ต่อ project (`solo-demo-liart`, `1px-demo`, Ops Hub project)

### Application rate limits (So1o)

Shared module: `Solo-Code/src/lib/rateLimit.server.ts`

| Route | Limit | หมายเหตุ |
|-------|-------|----------|
| `/api/public/csp-report` | 30/min/IP | CSP violation reports |
| `/api/public/payments/client-checkout` | 20/min/IP | Public checkout |
| `/api/public/payments/webhook` | 120/min/IP | Stripe retries |
| `/api/assistant/stream` | 30/min/IP | AI stream (JWT ด้วย) |

In-memory per instance — กัน abuse เบื้องต้น; ที่ scale สูงใช้ Vercel Firewall + Supabase quotas

---

## VPS (self-host / fallback)

### OS firewall

```bash
chmod +x scripts/setup-vps-firewall.sh
sudo ./scripts/setup-vps-firewall.sh
# SSH ไม่ใช่พอร์ต 22:
sudo SSH_PORT=2222 ./scripts/setup-vps-firewall.sh
```

เปิดเฉพาะ **22, 80, 443** — container อื่นไม่ bind ออก internet (`expose` ไม่ใช่ `ports`)

### nginx

- `deploy/nginx/security-headers.conf` — HSTS, X-Frame-Options, Permissions-Policy
- `deploy/nginx/default.conf` — `limit_req` 60 req/min บน So1o `/api/` (burst 20)
- Mount ใน `docker-compose.yml` แล้ว

### HTTPS

Caddy รับ 443 → ส่งต่อ nginx proxy — ดู `docker-compose.https.yml`

---

## Checklist ก่อน production

- [ ] `grep -r "service_role" Solo-Code/dist/` — ไม่มี leak
- [ ] `CRON_SECRET` ตั้งใน Vercel env (ไม่พึ่ง service role key)
- [ ] Stripe webhook URL + signature secret ตรง environment
- [ ] Supabase Auth → Redirect URLs ครบ HTTPS domains
- [ ] `./scripts/qa/security-smoke.mjs` ผ่าน
- [ ] Vercel Firewall rate rules (แนะนำ Pro)

---

## Pentest / scan

- ห้าม automated scan > **50 req/s** — กัน Vercel abuse detection / rate limits
- Logical rate-limit testing อยู่ in scope — ดู [`Solo-Code/docs/pentest-scope.md`](../Solo-Code/docs/pentest-scope.md)

---

## เอกสารที่เกี่ยวข้อง

- [`Solo-Code/docs/security.md`](../Solo-Code/docs/security.md) — trust model
- [`Anthem-Code/docs/security.md`](../Anthem-Code/docs/security.md) — RLS + edge functions
- [`scale-readiness-checklist.md`](./scale-readiness-checklist.md) § 2.7 Security
- [`deploy-vps.md`](./deploy-vps.md) — Docker deploy
- [`ecosystem-hosting.md`](./ecosystem-hosting.md) — topology

# Ecosystem Hosting — แยกความล้มเหลวระหว่างแอป

เมื่อ **an1hem ล่ม** → So1o + Ops Hub ยังเปิดได้ (และกลับกัน)  
เมื่อ **host หนึ่งล่ม** → แอปบน Vercel project อื่นไม่กระทบ  
**Supabase ล่ม** → ทุกแอปใช้ DB ไม่ได้ (SPOF ที่ยอมรับ — แยก project = ทิ้งบัญชีรวม)

## Topology (production — Vercel)

| แอป | Host | URL |
|-----|------|-----|
| **So1o** | Vercel (`solo-demo-liart`) | https://solofreelancer.com |
| **an1hem** | Vercel (`1px-demo`) | https://an1hem.app |
| **Ops Hub** | Vercel | https://hq.solofreelancer.com |

Deploy: `./scripts/deploy-vercel.sh production solo|1px` — ดู [`.cursor/rules/deploy-workflow.mdc`](../.cursor/rules/deploy-workflow.mdc)

Edge security: [`firewall.md`](./firewall.md)

Cross-app links เป็นลิงก์ภายนอกเท่านั้น (`Solo-Code/src/lib/productLinks.ts`) — ไม่มี runtime API call ข้ามแอป

```
Vercel (So1o) ──┐
Vercel (an1hem) ──┼──► Supabase (zkflkpbmbozrchqncpzi)
Vercel (Ops Hub) ─┘
```

## DNS Checklist (Vercel)

| Record | Type | Target | สถานะ |
|--------|------|--------|-------|
| `solofreelancer.com` | A | `76.76.21.21` (Vercel) | live |
| `www.solofreelancer.com` | CNAME | `cname.vercel-dns.com` | live |
| `an1hem.app` | A / CNAME | Vercel project | ตั้งเมื่อ deploy |
| `www.an1hem.app` | CNAME | Vercel | ตั้งเมื่อ deploy |
| `hq.solofreelancer.com` | CNAME | Vercel Ops Hub project | ตั้งเมื่อ deploy |

หลังตั้ง DNS แล้ว อัปเดต Supabase Auth → URL Configuration:

- `https://www.solofreelancer.com/**`
- `https://an1hem.app/**`
- `https://hq.solofreelancer.com/**`

## Deploy แยกแอป (Vercel)

```bash
./scripts/deploy-vercel.sh demo solo      # preview So1o
./scripts/deploy-vercel.sh demo 1px       # preview an1hem
./scripts/deploy-vercel.sh production solo
./scripts/deploy-vercel.sh production 1px
```

Demo URLs: [`demo-pack.md`](./demo-pack.md)

## VPS fallback (self-host)

ใช้เมื่อต้องการโฮสต์เอง — **ไม่ใช่ production path ปัจจุบัน**

### ทั้ง ecosystem บน VPS เดียว (decoupled)

```bash
cp .env.vps.example .env
sudo ./scripts/setup-vps-firewall.sh   # ufw 22/80/443
docker compose up --build -d
# หรือ HTTPS:
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build -d
```

Proxy รอแค่ `service_started` — แอปใดแอปหนึ่ง unhealthy ไม่ทำให้ nginx ล่มทุกโดเมน

Restart แอปเดียว:

```bash
docker compose up -d --no-deps anthem
docker compose up -d --no-deps solo
docker compose up -d --no-deps ops-hub
```

### an1hem อย่างเดียว (VPS)

```bash
cp anthem.env.example .env
chmod +x scripts/deploy-anthem.sh
./scripts/deploy-anthem.sh
./scripts/deploy-anthem-production.sh   # HTTPS
```

### Ops Hub อย่างเดียว (VPS)

```bash
cp ops-hub.env.example .env
./scripts/deploy-ops-hub.sh
./scripts/deploy-ops-hub-production.sh
```

รายละเอียด VPS: [`deploy-vps.md`](./deploy-vps.md)

## Env profiles

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `.env` (root) | `docker compose` รวม 3 แอป (VPS) |
| `anthem.env.example` | deploy an1hem standalone VPS |
| `ops-hub.env.example` | deploy Ops Hub standalone VPS |
| `Solo-Code/.env` | So1o dev + Vercel env pull |

## Health check

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

UptimeRobot / Better Stack — monitor แยก 3 URL:

- `https://www.solofreelancer.com`
- `https://an1hem.app`
- `https://hq.solofreelancer.com`

## Runbook

| อาการ | สาเหตุที่เป็นไปได้ | แก้ |
|-------|-------------------|-----|
| `an1hem.app` 502 แต่ So1o OK | Vercel deploy an1hem ล้ม | Vercel Dashboard → redeploy `1px-demo` |
| ทุกโดเมน 502 | Supabase หรือ DNS | `health-check.sh` + Supabase status |
| Hub เปิดได้แต่ตัวเลข 0 / banner เหลือง | query บางตาราง/schema error | ดู `SourceDegradedBanner` + Supabase logs |
| ทุกแอป login ไม่ได้ | Supabase down / Auth URL ผิด | ตรวจ Auth URLs ใน Dashboard |
| VPS: an1hem 502 แต่ So1o OK | anthem container crash | `docker compose logs anthem` |

## Supabase SPOF — ลดความเสียหาย

| มาตรการ | รายละเอียด |
|---------|------------|
| Staging project | optional สำหรับทดสอบ migration |
| Migration gate | `Solo-Code/scripts/supabase-push-via-api.sh` ทีละไฟล์ |
| Backup | Supabase daily backup (Pro) — ดู [`backup-restore.md`](./backup-restore.md) |
| Health probe | `scripts/health-check.sh` curl REST `/rest/v1/` |

**ไม่แนะนำ** แยก Supabase เป็น 2 project ตอนนี้ — จะทิ้ง unified auth / Pro tier

## ผลลัพธ์หลังแยก

| เหตุการณ์ | ก่อน | หลัง |
|----------|------|------|
| an1hem deploy ล่ม | กระทบทั้ง monolith | เฉพาะ an1hem.app |
| So1o Vercel project ล่ม | — | ไม่กระทบ an1hem/Hub |
| Ops Hub query error | ทุกหน้า Hub error | ข้อมูลบางส่วน + banner |
| Supabase ล่ม | ทุกแอปล่ม | ยังล่มทุกแอป (จำกัดทางเทคนิค) |

ดู deploy รายละเอียด: [deploy-vps.md](deploy-vps.md) · [firewall.md](firewall.md)

# Ecosystem Hosting — แยกความล้มเหลวระหว่างแอป

เมื่อ **an1hem ล่ม** → So1o + Ops Hub ยังเปิดได้ (และกลับกัน)  
เมื่อ **VPS หนึ่งล่ม** → แอปบน host อื่นไม่กระทบ  
**Supabase ล่ม** → ทุกแอปใช้ DB ไม่ได้ (SPOF ที่ยอมรับ — แยก project = ทิ้งบัญชีรวม)

## Topology แนะนำ

| แอป | Host | เหตุผล |
|-----|------|--------|
| **So1o** | Host เดิม (`solofreelancer.com` ~185.158.133.1) | เปิด production แล้ว — ไม่ย้ายตอน demo |
| **an1hem** | VPS ใหม่ หรือ Cloudflare Pages | static SPA deploy ง่าย แยกจาก So1o |
| **Ops Hub** | VPS เดียวกับ an1hem หรือ CF Pages แยก | admin-only traffic น้อย |

Cross-app links เป็นลิงก์ภายนอกเท่านั้น (`Solo-Code/src/lib/productLinks.ts`) — ไม่มี runtime API call ข้ามแอป

```
So1o host ──► solo container ──┐
Anthem host ──► anthem container ──┼──► Supabase (rvnzjiskqliexysicfmh)
Hub host ──► ops-hub container ──┘
```

## DNS Checklist

| Record | Type | Target | สถานะ |
|--------|------|--------|-------|
| `solofreelancer.com` | A | So1o VPS IP | live |
| `www.solofreelancer.com` | A/CNAME | So1o VPS | live |
| `an1hem.app` | A | Anthem VPS / CF | ตั้งเมื่อ deploy |
| `www.an1hem.app` | A/CNAME | Anthem VPS / CF | ตั้งเมื่อ deploy |
| `hq.solofreelancer.com` | A | Hub VPS / CF | ตั้งเมื่อ deploy |

หลังตั้ง DNS แล้ว อัปเดต Supabase Auth → URL Configuration:

- `https://www.solofreelancer.com/**`
- `https://an1hem.app/**`
- `https://hq.solofreelancer.com/**`

## Deploy แยกแอป

### ทั้ง ecosystem บน VPS เดียว (decoupled)

```bash
cp .env.vps.example .env
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

### an1hem อย่างเดียว (VPS/CF แยก)

```bash
cp anthem.env.example .env
chmod +x scripts/deploy-anthem.sh
./scripts/deploy-anthem.sh
# Production HTTPS (หลังตั้ง DNS an1hem.app):
./scripts/deploy-anthem-production.sh
```

Compose: `docker-compose.anthem.yml` — พอร์ต default `8080` (หรือ `HTTP_PORT` ใน `.env`)

### Ops Hub อย่างเดียว

```bash
cp ops-hub.env.example .env
chmod +x scripts/deploy-ops-hub.sh
./scripts/deploy-ops-hub.sh
# Production HTTPS (หลังตั้ง DNS hq.solofreelancer.com):
./scripts/deploy-ops-hub-production.sh
```

Compose: `docker-compose.ops-hub.yml` — พอร์ต default `3091`

### Cloudflare Pages (ทางเลือก)

Build static แล้ว deploy แยก project:

| แอป | Build | Env |
|-----|-------|-----|
| an1hem | `cd Anthem-Code && npm run build` → `dist/` | `VITE_SUPABASE_*`, `VITE_SO1O_APP_URL`, `VITE_OPS_HUB_URL` |
| Ops Hub | `cd Ops-Hub && npm run build` → `dist/` | เหมือนกัน + `VITE_SITE_URL` |

## Env profiles

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `.env` (root) | `docker compose` รวม 3 แอป |
| `anthem.env.example` | deploy an1hem standalone |
| `ops-hub.env.example` | deploy Ops Hub standalone |
| `Solo-Code/.env` | So1o dev + SSR secrets |

## Health check

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

Cron บน VPS (ทุก 5 นาที):

```cron
*/5 * * * * /path/to/AunAun/scripts/health-check.sh >> /var/log/ecosystem-health.log 2>&1
```

UptimeRobot / Better Stack — monitor แยก 3 URL:

- `https://www.solofreelancer.com`
- `https://an1hem.app`
- `https://hq.solofreelancer.com`

## Runbook

| อาการ | สาเหตุที่เป็นไปได้ | แก้ |
|-------|-------------------|-----|
| `an1hem.app` 502 แต่ So1o OK | anthem container crash | `docker compose logs anthem` → `docker compose up -d --no-deps anthem` |
| ทุกโดเมน 502 | nginx proxy หรือ Caddy ล่ม | `docker compose ps proxy caddy` |
| Hub เปิดได้แต่ตัวเลข 0 / banner เหลือง | query บางตาราง/schema error | ดู `SourceDegradedBanner` + Supabase logs; แอปอื่นไม่กระทบ |
| ทุกแอป login ไม่ได้ | Supabase down / Auth URL ผิด | ตรวจ `health-check.sh` Supabase line + Dashboard Auth URLs |
| So1o host ล่ม | VPS So1o | an1hem + Hub ยังได้ถ้าแยก host แล้ว |

## Supabase SPOF — ลดความเสียหาย

| มาตรการ | รายละเอียด |
|---------|------------|
| Staging project | optional สำหรับทดสอบ migration |
| Migration gate | `Solo-Code/scripts/supabase-push-via-api.sh` ทีละไฟล์ |
| Backup | Supabase daily backup (Pro) หรือ `pg_dump` schedule |
| Health probe | `scripts/health-check.sh` curl REST `/rest/v1/` |

**ไม่แนะนำ** แยก Supabase เป็น 2 project ตอนนี้ — จะทิ้ง unified auth / Pro tier

## ผลลัพธ์หลังแยก

| เหตุการณ์ | ก่อน | หลัง |
|----------|------|------|
| an1hem container ล่ม | อาจทำให้ proxy ไม่ขึ้น / 502 ทุกโดเมน | เฉพาะ an1hem.app |
| So1o host ล่ม | กระทบทุกอย่างบน host เดียว | ไม่กระทบ an1hem/Hub (ถ้าแยก host) |
| Ops Hub query error | ทุกหน้า Hub error | ข้อมูลบางส่วน + banner |
| Supabase ล่ม | ทุกแอปล่ม | ยังล่มทุกแอป (จำกัดทางเทคนิค) |

ดู deploy รายละเอียด: [deploy-vps.md](deploy-vps.md)

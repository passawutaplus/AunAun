# So1o Ops Hub

ศูนย์บัญชาการ Ecosystem — monitor **So1o + an1hem** จากที่เดียว พร้อม deep link เข้า admin ลึก

| | |
|---|---|
| **Production** | `https://hq.solofreelancer.com` |
| **Dev** | `http://localhost:3090` |
| **Supabase** | `rvnzjiskqliexysicfmh` (บัญชีเดียวกับ So1o/an1hem) |

## Quick start

```bash
cd Ops-Hub
./scripts/sync-env-from-solo.sh   # คัดลอก key จาก Solo-Code/.env
npm install
npm run dev
```

Login ด้วยบัญชีที่มี `public.user_roles.role = 'admin'`

## ฟีเจอร์

- สลับมุมมอง **รวม | So1o | an1hem**
- Alert queue (ตั๋ว, KYC, AML, ถอน Pixel, …) → กดเปิด admin ลึก
- KPI cards + deep links
- Realtime refresh เมื่อมี `shared.notifications` แบบ `admin_*`
- ลิงก์จาก So1o Mission Control และ an1hem Admin sidebar

## Deploy

### Docker Compose (VPS)

รวมใน `docker compose up` ที่ root repo แล้ว — service `ops-hub` + nginx `hq.solofreelancer.com`

```bash
# root .env
VITE_OPS_HUB_URL=https://hq.solofreelancer.com

docker compose up --build -d ops-hub
```

แก้ `deploy/nginx/default.conf` → `server_name hq.solofreelancer.com`

### Static only

```bash
npm run build
# deploy dist/ ไป hq.solofreelancer.com (Cloudflare Pages, nginx, ฯลฯ)
```

### Supabase Auth redirect URLs

```bash
cd Solo-Code
export SUPABASE_ACCESS_TOKEN=sbp_...
./scripts/supabase-setup-project.sh
```

หรือเพิ่มเอง: `https://hq.solofreelancer.com/**`, `http://localhost:3090/**`

### DNS

```
CNAME hq → VPS หรือ hosting ของคุณ
```

## เอกสาร

- [Wireframe](docs/WIREFRAME.md)
- [Data schema](docs/DATA-SCHEMA.md)

## ไม่ใช่

Hub นี้ **ไม่แทน** admin เต็มรูปแบบ — เป็น monitor + alert + deep link เท่านั้น

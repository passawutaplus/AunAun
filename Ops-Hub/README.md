# So1o Ops Hub

PM Workspace + ศูนย์บัญชาการ Ecosystem — monitor **So1o + an1hem** แบบ Linear-style

| | |
|---|---|
| **Production** | `https://so1o-ops-hub.vercel.app` |
| **Dev** | `http://localhost:3090` |
| **Supabase** | `zkflkpbmbozrchqncpzi` |

## Quick start

```bash
cd Ops-Hub
./scripts/sync-env-from-solo.sh
npm install
npm run dev
```

Login ด้วยบัญชี `public.user_roles.role = 'admin'` → เข้า **Inbox**

## ฟีเจอร์

### ภาพรวม & สุขภาพ

| หน้า | Route | คำอธิบาย |
|------|-------|----------|
| **ภาพรวม** | `/` | KPI, Flywheel Health, alerts, cross-app smoke |
| **มอนิเตอร์** | `/monitor` | Health probe, Supabase/Vercel usage, playbooks |
| **ติดตามระบบ** | `/tracking` | % ความพร้อม 3 เว็บ + sync จาก monitor |

### Ecosystem

| หน้า | Route | คำอธิบาย |
|------|-------|----------|
| **เชื่อมต่อ Ecosystem** | `/connections` | Flywheel conversion, SSO metrics, funnel alerts |
| **User 360** | `/users`, `/users/:id` | ค้นหาบัญชีข้าม So1o + an1hem |
| **เรดาร์เทรนด์** | `/radar` | Product intel → promote เป็น Hub Issue |

### PM (Linear-style)

| หน้า | Route | คำอธิบาย |
|------|-------|----------|
| **Inbox** | `/inbox` | Triage + ecosystem anomalies |
| **Board** | `/board` | Kanban 4 คอลัมน์ |
| **Issues** | `/issues` | List + filter/search |
| **Hub Work** | `/work` | `ops.issues` |
| **Cycles** | `/cycles` | Sprint |
| **Roadmap** | `/roadmap` | Quarter + Ecosystem board |
| **Activity** | `/activity` | `platform_events` (realtime) |

- Drawer รายละเอียด: เปลี่ยน status, priority, admin note
- **Promote** คิวภายนอก → Hub Issue (`ops_promote_work_item`)
- **Comments** บน Hub Issue (`ops.issue_comments`)
- **Cycles / Roadmap** สร้างและแก้จาก UI + ลิงก์ issue ↔ roadmap
- **Bulk inbox** เลือกหลายรายการ → ย้ายสถานะพร้อมกัน
- View switcher: รวม / So1o / an1hem

## Schema

รัน migration ก่อนใช้ Hub Work / Cycles / Roadmap:

```bash
cd Solo-Code
npx supabase db push
```

ดู [DATA-SCHEMA.md](docs/DATA-SCHEMA.md)

## Deploy

### Docker Compose (VPS)

```bash
# root .env
VITE_OPS_HUB_URL=https://hq.solofreelancer.com
docker compose up --build -d ops-hub
```

### Supabase Auth redirect URLs

```bash
cd Solo-Code
./scripts/supabase-setup-project.sh
```

เพิ่ม: `https://hq.solofreelancer.com/**`, `http://localhost:3090/**`

## เอกสาร

- [Wireframe](docs/WIREFRAME.md)
- [Data schema](docs/DATA-SCHEMA.md)
- [Ecosystem notifications](../docs/ecosystem-notifications.md)
- [Manual QA](../docs/MANUAL-TESTING.md) (item 61 — Ops Hub PM routes)
- [Ecosystem hosting](../docs/ecosystem-hosting.md)

## ไม่ duplicate

KYC document review, cashout approval, chat support — ยัง deep link ไป admin ลึก

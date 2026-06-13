# So1o Ops Hub

PM Workspace + ศูนย์บัญชาการ Ecosystem — monitor **So1o + an1hem** แบบ Linear-style

| | |
|---|---|
| **Production** | `https://hq.solofreelancer.com` |
| **Dev** | `http://localhost:3090` |
| **Supabase** | `rvnzjiskqliexysicfmh` |

## Quick start

```bash
cd Ops-Hub
./scripts/sync-env-from-solo.sh
npm install
npm run dev
```

Login ด้วยบัญชี `public.user_roles.role = 'admin'` → เข้า **Inbox**

## ฟีเจอร์ PM (Linear-style)

| หน้า | คำอธิบาย |
|------|----------|
| **Inbox** | คิว Triage รวม tickets, feedback, reports, suggestions |
| **Board** | Kanban 4 คอลัมน์ — ลากย้ายสถานะ |
| **Issues** | List + filter/search |
| **Hub Work** | งานภายใน `ops.issues` (OPS-0001) |
| **Cycles** | Sprint + burndown ง่าย |
| **Roadmap** | Timeline ตาม quarter |
| **Activity** | `platform_events` |
| **Overview** | KPI + alerts + deep links (เดิม) |

- Drawer รายละเอียด: เปลี่ยน status, priority, admin note
- **Promote** คิวภายนอก → Hub Issue (`ops_promote_work_item`)
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

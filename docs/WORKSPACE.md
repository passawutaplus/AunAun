# Workspace layout

Updated: 2026-07-03

AunAun เป็น **inline monorepo** — submodule เลิกใช้แล้ว

| งาน | โฟลเดอร์ |
|-----|----------|
| Ecosystem, deploy scripts, docs รวม | `AunAun-fresh/` ← **workspace หลัก** |
| Aplus1 (Anthem) frontend | `AunAun-fresh/Anthem-Code/` |
| So1o + Supabase migrations (canonical backend) | `AunAun-fresh/Solo-Code/` |
| Ops Hub admin | `AunAun-fresh/Ops-Hub/` |

**กฎ:**

- ใช้ `AunAun-fresh` เป็น source of truth — อย่าใช้โฟลเดอร์เก่าที่มี `.git` แยก
- Migrations ทั้งหมดอยู่ที่ `Solo-Code/supabase/migrations/`
- Deploy: ดู [.cursor/rules/deploy-workflow.mdc](../.cursor/rules/deploy-workflow.mdc)

## Quick start

```bash
cd Solo-Code && npm install && npm run dev    # → http://localhost:5173
cd Anthem-Code && npm install && npm run dev  # → http://localhost:8080
```

## Migrations

```bash
./scripts/check-migrations-pending.sh
cd Solo-Code && ./scripts/supabase-push-via-api.sh
```

## Production URLs

| App | Production | Demo |
|-----|------------|------|
| Aplus1 | https://aplus1.app | https://aplus1-demo.vercel.app |
| So1o | https://solofreelancer.com | https://solo-demo-liart.vercel.app |
| Ops Hub | https://hq.solofreelancer.com | — |

Legacy domain `an1hem.app` redirect ไป `aplus1.app` — ใช้ `aplus1.app` ใน docs/code ใหม่ทั้งหมด

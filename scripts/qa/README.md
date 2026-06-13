# QA automation scripts

รันทั้งหมด:

```bash
./scripts/test-ecosystem-full.sh
```

| Script | ทำอะไร |
|--------|--------|
| `test-ecosystem.sh` | unit + curl smoke + health |
| `test-ecosystem-full.sh` | ทุกอย่างด้านล่าง |
| `qa/security-smoke.mjs` | service_role + open redirect |
| `qa/performance-timing.mjs` | TTFB curl |
| `qa/invalid-token.mjs` | invalid share tokens |
| `qa/cron-smoke.mjs` | cron/webhook ต้องไม่ open |
| `qa/rls-smoke.mjs` | Supabase RLS (ต้อง anon key; user ถ้ามี E2E_*) |
| `qa/puppeteer-gate.sh` | Puppeteer smoke + chat + auth |
| `qa/admin-crawl.mjs` | ทุก admin tab (ต้อง E2E_ADMIN_*) |

Env: `SOLO_BASE_URL`, `ANTHEM_BASE_URL`, credentials ใน `.env.local`

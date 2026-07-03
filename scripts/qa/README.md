# QA automation scripts

รันทั้งหมด:

```bash
./scripts/test-ecosystem-full.sh
```

| Script | ทำอะไร |
|--------|--------|
| `test-ecosystem.sh` | unit + curl smoke + health |
| `test-ecosystem-full.sh` | ทุกอย่างด้านล่าง + `stripe:verify` |
| `qa/security-smoke.mjs` | service_role + open redirect |
| `qa/security-headers-smoke.mjs` | HSTS + baseline headers (Vercel production) |
| `qa/performance-timing.mjs` | TTFB curl (default gate `QA_TTFB_MS=2500`) |
| `qa/invalid-token.mjs` | invalid share tokens |
| `qa/cron-smoke.mjs` | cron/webhook ต้องไม่ open |
| `qa/rls-smoke.mjs` | Supabase RLS (ต้อง anon key; user ถ้ามี E2E_*) |
| `qa/puppeteer-gate.sh` | Puppeteer smoke + chat + auth |
| `qa/admin-crawl.mjs` | ทุก admin tab (ต้อง E2E_ADMIN_*) |

## Optional flags

```bash
FULL_LIGHTHOUSE=1 ./scripts/test-ecosystem-full.sh   # รวม Lighthouse (ต้อง Chrome)
QA_TTFB_MS=1200 ./scripts/test-ecosystem-full.sh     # gate เข้มขึ้น (manual QA ใช้ <1.2s)
```

## Env

`SOLO_BASE_URL`, `ANTHEM_BASE_URL`, credentials ใน `.env.local`

Default URLs:
- So1o: `https://solofreelancer.com` (หรือ `https://solo-demo-liart.vercel.app`)
- Anthem: `https://aplus1-demo.vercel.app` (หรือ production `https://aplus1.app`)

## Manual QA

รายการที่ gate ไม่ครอบ: [`docs/MANUAL-TESTING.md`](../docs/MANUAL-TESTING.md)

# Puppeteer E2E (ทางเลือกแทน Playwright)

ใช้เมื่อ Playwright ติดตั้ง browser ไม่ได้ (WSL / Ubuntu ใหม่) หรืออยากใช้ Chrome ในเครื่อง

| Playwright | Puppeteer |
|------------|-----------|
| `e2e/smoke/public.smoke.spec.ts` | `npm run e2e:puppeteer:smoke` |
| `e2e/auth.e2e.spec.ts` + `flows/admin` + `project-create` | `npm run e2e:puppeteer` (suite `auth`) |
| `e2e/flows/chat.smoke.spec.ts` | `npm run e2e:puppeteer:chat` |

## ติดตั้งครั้งแรก (Linux / WSL)

```bash
bash scripts/e2e-puppeteer/install-chrome-deps.sh
```

Fallback ไม่ต้อง browser: `npm run smoke:public`

## รัน

```bash
npm run e2e:puppeteer:smoke
E2E_BASE_URL=https://aplus1-demo.vercel.app npm run e2e:puppeteer:smoke

# Auth + project editor — ต้อง .env.local
npm run e2e:puppeteer

# Chat demo (default demo seed account)
npm run e2e:puppeteer:chat
E2E_BASE_URL=https://aplus1-demo.vercel.app npm run e2e:puppeteer:chat

E2E_HEADED=1 npm run e2e:puppeteer:smoke
```

## Env vars (`.env.local`)

- `E2E_BASE_URL` — default `http://localhost:8080`; demo deploy `https://aplus1-demo.vercel.app`
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`
- `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD` — chat suite (มี default seed)
- `PUPPETEER_EXECUTABLE_PATH`
- `E2E_SUITE` — `smoke` | `auth` | `chat` | `all`

ดู [`test-accounts.md`](./test-accounts.md) สำหรับ role matrix

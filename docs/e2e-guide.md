# E2E Testing Guide — Aplus1 + So1o

Updated: 2026-07-03

Playwright เป็นค่าเริ่มต้น · Puppeteer เป็นทางเลือก WSL · `smoke:public` (curl) สำหรับ gate เร็ว

**ห้าม** รัน E2E ที่แก้ data บน production DB — ใช้ demo/preview/local

---

## Quick reference

| App | Default base URL | Playwright | Puppeteer smoke |
|-----|------------------|------------|-----------------|
| **Aplus1** | `https://aplus1-demo.vercel.app` | `cd Anthem-Code && npm run e2e:smoke` | `npm run e2e:puppeteer:smoke` |
| **So1o** | `http://localhost:5173` (dev auto-start) | `cd Solo-Code && npm run e2e:smoke` | `npm run e2e:puppeteer:smoke` |

Public curl (ไม่ต้อง browser):

```bash
cd Anthem-Code && npm run smoke:public
cd Solo-Code && npm run smoke:public
```

Ecosystem gate: `./scripts/test-ecosystem.sh` หรือ `./scripts/test-ecosystem-full.sh`

---

## Playwright

### Install (ครั้งแรก)

```bash
npm install
npx playwright install --with-deps chromium   # Aplus1: chromium พอ
npx playwright install --with-deps            # So1o: + mobile-safari project
```

### Aplus1 (`Anthem-Code/`)

```bash
cd Anthem-Code
npm run e2e:smoke                              # demo default
E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke
npm run e2e:seo                                # SEO meta smoke

# Full E2E (ต้อง E2E_* env)
export E2E_USER_EMAIL=... E2E_USER_PASSWORD=...
export E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...
bunx playwright test --project=chromium
bunx playwright test --ui
```

Config: `playwright.config.ts` — projects `smoke`, `chromium`

### So1o (`Solo-Code/`)

```bash
cd Solo-Code
npm run e2e:smoke
bunx playwright test --project=mobile-safari  # optional
bunx playwright test e2e/auth.e2e.spec.ts
```

Config: auto-start dev server + projects `smoke`, `chromium`, `mobile-safari`

### โครงสร้าง (ทั้งสองแอป)

```text
e2e/
├── fixtures/accounts.ts
├── helpers/auth.ts
├── smoke/*.smoke.spec.ts      # ไม่ login
├── auth.e2e.spec.ts
└── flows/                     # admin, project-create, chat (Aplus1)
```

### Env vars (`.env.local`)

| Var | Aplus1 default | So1o default |
|-----|----------------|--------------|
| `E2E_BASE_URL` | `https://aplus1-demo.vercel.app` | `http://localhost:5173` |
| `E2E_USER_EMAIL` / `PASSWORD` | ขอจาก owner | ขอจาก owner |
| `E2E_ADMIN_EMAIL` / `PASSWORD` | ขอจาก owner | ขอจาก owner |
| `E2E_DEMO_EMAIL` / `PASSWORD` | chat suite (seed default) | — |

ดู role matrix: `Anthem-Code/docs/test-accounts.md`, `Solo-Code/docs/test-accounts.md`

### เขียนเทส

```ts
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test("example", async ({ page }) => {
  await signIn(page, "user");
  await page.goto("/");
  await expect(page.getByRole("heading")).toBeVisible();
});
```

- ใช้ `getByRole`, `getByLabel` — อย่า `waitForTimeout`
- แต่ละ test self-contained + cleanup ของตัวเอง

---

## Puppeteer (WSL / ไม่มี Playwright browser)

### Install (Linux / WSL)

```bash
bash scripts/e2e-puppeteer/install-chrome-deps.sh   # ในแต่ละ app
# หรือ PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

### คำสั่ง

```bash
# Aplus1
cd Anthem-Code
npm run e2e:puppeteer:smoke
npm run e2e:puppeteer:chat
E2E_BASE_URL=https://aplus1-demo.vercel.app npm run e2e:puppeteer:smoke
E2E_HEADED=1 npm run e2e:puppeteer:smoke

# So1o
cd Solo-Code
npm run e2e:puppeteer:smoke
E2E_BASE_URL=https://solofreelancer.com npm run e2e:puppeteer:smoke
E2E_SUITE=auth npm run e2e:puppeteer
```

| Playwright spec | Puppeteer |
|-----------------|-----------|
| `e2e/smoke/public.smoke.spec.ts` | `e2e:puppeteer:smoke` |
| `e2e/auth.e2e.spec.ts` + flows | `e2e:puppeteer` (suite `auth`) |
| `e2e/flows/chat.smoke.spec.ts` (Aplus1) | `e2e:puppeteer:chat` |

Extra env: `E2E_SUITE` = `smoke` | `auth` | `chat` | `all`

### curl vs Puppeteer smoke

| | `smoke:public` | Puppeteer smoke |
|--|----------------|-----------------|
| ต้อง browser | ไม่ | ใช่ |
| Security headers | ไม่ | ตรวจ |
| WSL ไม่มี Chrome | ✅ | ต้องติดตั้ง |

แนะนำรันทั้งสองใน release gate

---

## CI (อนาคต)

```yaml
- run: npx playwright install --with-deps
- run: npm run e2e:smoke
  env:
    E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
```

---

## Per-app stubs

รายละเอียดเดิมย้ายมารวมที่นี่:

- [Anthem-Code/docs/e2e-playwright.md](../Anthem-Code/docs/e2e-playwright.md) → redirect
- [Anthem-Code/docs/e2e-puppeteer.md](../Anthem-Code/docs/e2e-puppeteer.md) → redirect
- [Solo-Code/docs/e2e-playwright.md](../Solo-Code/docs/e2e-playwright.md) → redirect
- [Solo-Code/docs/e2e-puppeteer.md](../Solo-Code/docs/e2e-puppeteer.md) → redirect

# Playwright E2E

> **ทางเลือก (WSL / OS ที่ Playwright ไม่รองรับ):** ใช้ Puppeteer — ดู [`e2e-puppeteer.md`](./e2e-puppeteer.md)

## Install

```bash
npm install -D @playwright/test
npx playwright install --with-deps
```

(Playwright เป็น opt-in เพราะ download browser ~300MB)

## Run

```bash
# all tests
bunx playwright test

# smoke only (fastest)
bunx playwright test --project=smoke

# UI mode (debug)
bunx playwright test --ui

# specific spec
bunx playwright test e2e/auth.e2e.spec.ts

# headed
bunx playwright test --headed

# show last report
bunx playwright show-report
```

## Config

`playwright.config.ts` — auto-start dev server + 3 projects:

- `smoke` — public routes only (no auth)
- `chromium` — full E2E desktop
- `mobile-safari` — Mobile Safari emulation

## Env vars

สร้าง `.env.local`:

```bash
E2E_BASE_URL=http://localhost:5173
E2E_USER_EMAIL=test+usera@example.com
E2E_USER_PASSWORD=...
E2E_ADMIN_EMAIL=test+admin@example.com
E2E_ADMIN_PASSWORD=...
```

(ขอจาก owner — ดู `test-accounts.md`)

## Structure

```
e2e/
├── fixtures/
│   └── accounts.ts        # อ่าน env → return account credentials
├── helpers/
│   └── auth.ts            # signIn(role) helper
├── smoke/
│   └── public.smoke.spec.ts
├── auth.e2e.spec.ts
└── flows/
    ├── project-create.e2e.spec.ts
    └── admin.e2e.spec.ts
```

## Writing a test

```ts
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test("user can create a project", async ({ page }) => {
  await signIn(page, "user");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /โปรเจกต์ใหม่/ }).click();
  await page.getByLabel("ชื่อโปรเจกต์").fill("Test Project");
  await page.getByRole("button", { name: /บันทึก/ }).click();
  await expect(page.getByText("Test Project")).toBeVisible();
});
```

## CI integration

```yaml
# .github/workflows/e2e.yml
- run: npm ci
- run: npx playwright install --with-deps
- run: npm run e2e:smoke
  env:
    E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
    E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
```

## Tips

- Use role-based selectors (`getByRole`, `getByLabel`) — survive UI changes
- Avoid `page.waitForTimeout(...)` — use `waitFor(...)` with explicit condition
- Each test ต้อง self-contained — สร้าง + cleanup ของตัวเอง
- ห้าม share state ระหว่าง test (use `test.beforeEach` for fresh login)

# E2E (Playwright) — ติดตั้ง + รัน

> **ทางเลือก (WSL):** [`e2e-puppeteer.md`](./e2e-puppeteer.md) · `npm run smoke:public` (curl)

`@playwright/test` อยู่ใน devDependencies แล้ว

## ครั้งแรก

```bash
npm install
npx playwright install --with-deps chromium
```

## รัน

```bash
# รันกับ deployment เดโม่ (default ใน playwright.config.ts)
bunx playwright test --project=smoke

# รันกับ localhost
E2E_BASE_URL=http://localhost:8080 bunx playwright test --project=smoke

# E2E ทั้งหมด (ต้องตั้ง env test accounts ก่อน)
export E2E_USER_EMAIL=qa-user-a@example.com
export E2E_USER_PASSWORD='...'
export E2E_ADMIN_EMAIL=qa-admin@example.com
export E2E_ADMIN_PASSWORD='...'
bunx playwright test --project=chromium

# UI mode สำหรับ debug
bunx playwright test --ui

# Report
bunx playwright show-report
```

## โครงสร้าง

```text
e2e/
├── fixtures/accounts.ts      # อ่าน credential จาก env
├── helpers/auth.ts           # signIn(role) helper
├── smoke/*.smoke.spec.ts     # public-only checks, ไม่ login
├── auth.e2e.spec.ts          # login + session
└── flows/                    # ต้อง login
    ├── admin.e2e.spec.ts
    └── project-create.e2e.spec.ts
```

## หมายเหตุ

- `playwright.config.ts` default ชี้ `https://aplus1-demo.vercel.app` — ตั้ง `E2E_BASE_URL` เพื่อ override (เช่น localhost)
- ห้ามรัน E2E บน production DB จริง — ใช้ preview environment เท่านั้น
- เพิ่ม script ใน `package.json` ได้ตามต้องการ:
  ```json
  "e2e:smoke": "playwright test --project=smoke",
  "e2e": "playwright test --project=chromium"
  ```

## CI (อนาคต)

ดู `.github/workflows/e2e.yml` — รัน smoke ทุก PR

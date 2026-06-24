# QA Onboarding

ยินดีต้อนรับ! เอกสารนี้ช่วยให้คุณเริ่ม test ภายใน 30 นาที

## 1. Clone & install

```bash
git clone <repo>
cd Solo-Code
npm install
```

## 2. Environment

`.env` มี publishable Supabase config อยู่แล้ว — **ไม่ต้องแก้**

ถ้าจะ run Playwright E2E ต้อง:
```bash
cp .env.example .env.local
# กรอก:
E2E_USER_EMAIL=test+user@example.com
E2E_USER_PASSWORD=...
E2E_ADMIN_EMAIL=test+admin@example.com
E2E_ADMIN_PASSWORD=...
```

(ขอ credential ที่ owner — ดู `test-accounts.md`)

## 3. Run dev server

```bash
npm run dev
```

เปิด http://localhost:5173

## 4. Run tests

```bash
npm run test                # vitest (unit)
npm run test:gate           # unit + smoke:public
npm run e2e:smoke           # Playwright (ถ้ารองรับ OS)
npm run e2e:puppeteer:smoke # Puppeteer fallback (WSL)
```

ติดตั้ง Playwright browsers ครั้งแรก:
```bash
npx playwright install --with-deps
```

## 5. Ecosystem full gate

```bash
cd .. && ./scripts/test-ecosystem-full.sh
```

## 6. Manual testing

รายการที่ต้องลงมือเอง: [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md)

## 7. Bug report template

```markdown
**Title**: <short summary>
**Severity**: critical / high / medium / low / cosmetic
**Environment**: demo / production · browser · viewport · OS
**Account used**: <which test account>
**Steps to reproduce**:
1.
2.
3.
**Expected**:
**Actual**:
**Evidence**: screenshot / video / console log / network trace
```

# QA Onboarding

Welcome. This guide gets you from zero → first bug report in ~15 minutes.

## 1. Setup

```bash
git clone <repo-url>
cd Anthem-Code
npm install
npm run dev
```

The `.env` file is auto-generated — do not edit. App boots at `http://localhost:8080`.

## 2. Run tests

```bash
npm run test             # vitest unit + integration
npm run test:gate        # unit + smoke:public
npm run e2e:puppeteer:smoke
npm run e2e:puppeteer:chat   # demo chat flow
```

## 3. Email preview

```bash
npm run email:preview    # → email-previews/index.html
```

## 4. Get test accounts

Email the security contact in `/SECURITY.md`. Demo accounts: [`demo-catalog.md`](./demo-catalog.md)

## 5. Start testing

- Checklist: [`qa-checklist.md`](./qa-checklist.md)
- Full plan: [`full-test-plan.md`](./full-test-plan.md)
- Manual items: [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md)
- Notifications: [`../../docs/ecosystem-notifications.md`](../../docs/ecosystem-notifications.md)

## 6. Bug report template

```markdown
**Title**: <short summary>
**Severity**: critical / high / medium / low / cosmetic
**Environment**: demo (aplus1-demo.vercel.app) / production (an1hem.app) · browser · OS
**Account used**: <which test account>
**Steps to reproduce**:
1.
2.
3.
**Expected**:
**Actual**:
**Evidence**: screenshot / video / console log
```

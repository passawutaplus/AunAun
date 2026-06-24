# Production Security Checklist

ใช้ก่อน promote So1o + 1PX ไป production (หรือหลัง rotate secrets)

## Environment

- [ ] `VITE_DEMO_MODE=false` (1PX builds)
- [ ] `CRON_SECRET` ตั้งค่าแล้ว — schedulers ใช้ Bearer นี้ ไม่ใช่ service role
- [ ] `ECOSYSTEM_SYNC_SECRET` rotated (ถ้าใช้ cross-app sync)
- [ ] Stripe webhook secrets (`PAYMENTS_*_WEBHOOK_SECRET`) สำหรับ sandbox + live
- [ ] LINE channel secrets ตั้งใน Supabase Edge secrets

## Database (apply SQL)

- [ ] รัน [`scripts/ecosystem/security-mock-payments.sql`](../../scripts/ecosystem/security-mock-payments.sql)
- [ ] Production: รัน [`security-mock-payments-prod-revoke.sql`](../../scripts/ecosystem/security-mock-payments-prod-revoke.sql)
- [ ] Demo only: รัน [`security-mock-payments-demo-enable.sql`](../../scripts/ecosystem/security-mock-payments-demo-enable.sql)

## HTTP / App

- [ ] So1o: CSP enforce + `report-uri /api/public/csp-report` (see `src/start.ts`)
- [ ] 1PX: HSTS + CSP enforce ใน `vercel.json` / `nginx.conf`
- [ ] Payment redirect allowlist active (`assertAllowedPaymentRedirectUrl`)

## CI / Build

- [ ] `npm run build && ! grep -r service_role dist/` pass (So1o)
- [ ] `npm audit --audit-level=high` reviewed
- [ ] Dependabot enabled (`.github/dependabot.yml`)

## Supabase Dashboard (manual)

- [ ] Auth redirect URL allowlist — production domains only
- [ ] RLS audit บน tables สำคัญ
- [ ] Edge function secrets: `CORS_ALLOWED_ORIGINS_EXTRA` สำหรับ preview URLs ถ้าจำเป็น

## Pentest

- [ ] Target environment decided — see [`pentest-scope.md`](./pentest-scope.md)
- [ ] Test accounts provisioned — see [`test-accounts.md`](./test-accounts.md)

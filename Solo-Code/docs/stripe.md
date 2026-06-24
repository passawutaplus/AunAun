# Stripe — Subscriptions, PX Top-up, In-House

So1o เป็น billing hub ของ ecosystem — Stripe Checkout + webhooks อยู่ที่ So1o server routes

## Quick commands

```bash
cd Solo-Code

# Sync Products + Prices ไป Stripe sandbox (idempotent)
npm run stripe:sync

# ตรวจ lookup keys ครบ
npm run stripe:verify
```

Scripts:
- `scripts/stripe/provision-sandbox.mjs` — สร้าง/อัปเดต catalog
- `scripts/stripe/verify-catalog.mjs` — ตรวจว่า lookup keys มีใน Stripe
- `scripts/stripe/catalog.sandbox.json` / `catalog.live.json` — output หลัง sync

## Environment variables

| Variable | บทบาท |
|----------|--------|
| `VITE_PAYMENTS_CLIENT_TOKEN` | `pk_test_...` / `pk_live_...` (client) |
| `STRIPE_SANDBOX_API_KEY` | `sk_test_...` (server, sandbox) |
| `STRIPE_LIVE_API_KEY` | `sk_live_...` (server, production) |
| `STRIPE_USE_DIRECT` | `true` = เรียก Stripe API ตรง (ไม่ผ่าน Lovable connector) |
| `VITE_STRIPE_ENV` | `sandbox` / `live` |
| `VITE_SITE_URL` | redirect หลัง checkout |

Webhook endpoint:

```
https://solofreelancer.com/api/public/payments/webhook?env=sandbox
```

## Lookup keys (catalog)

### Subscriptions (So1o)

| Key | แผน | ราคา (THB) |
|-----|-----|-----------|
| `pro_monthly` | Pro | 249/เดือน |
| `pro_yearly` | Pro | 2,388/ปี |
| `pro_plus_monthly` | Pro+ | 399/เดือน |
| `pro_plus_yearly` | Pro+ | 3,828/ปี |
| `inhouse_monthly` | In-House (per seat) | 599/เดือน |
| `inhouse_yearly` | In-House (per seat) | 5,750/ปี |

### One-time

| Key | สินค้า |
|-----|--------|
| `credits_100`, `credits_500`, `credits_2000` | So1o AI credits |
| `px_500`, `px_2000`, `px_10000` | an1hem PX wallet top-up |
| `boost_99_3d`, `boost_249_7d`, `boost_499_14d` | an1hem Boost โพสต์ตัวเอง |
| `ad_basic`, `ad_standard`, `ad_premium` | an1hem โฆษณาแบรนด์ (admin อนุมัติ) |

Source of truth: `scripts/stripe/provision-sandbox.mjs` + `src/lib/stripe.ts`

### Boost (an1hem)

1. กด Boost บนผลงาน/โพสต์ชุมชน → `create_post_boost` RPC
2. Checkout `boost_*` lookup key (metadata `boostId`)
3. Webhook `kind=boost` → `activate_post_boost_stripe` → badge Boosted + feed ranking

### Brand Ads (an1hem)

1. `/advertise` สมัครแคมเปญ → Checkout `ad_*` (metadata `applicationId`)
2. Webhook `kind=ad` → `fulfill_ad_payment_stripe` → admin อนุมัติ → AdCard

### Escrow marketplace

1. สร้างจาก So1o Quotation หรือ an1hem Hire → `create_escrow_*` RPC (ต้อง Connect)
2. ลูกค้าเปิด `/pay/:portal_token` → Stripe Checkout (เงินพักที่ platform)
3. ลูกค้า approve → `pending_release` → admin `/admin?section=payments` → Connect Transfer
4. ลูกค้า approve → `pending_release` → admin `/admin?section=payments` → Connect Transfer
5. ค่าธรรมเนียม: **Free 5% · Pro+ 2.5%** (ทางเลือก — โอนตรง/Job Tracker ไม่ผ่านเรา)
6. SQL: `scripts/ecosystem/payment-policy-2026.sql` + `boost-escrow-payments.sql`

## Flows

### Subscription checkout

1. User เลือกแผนที่ `/pricing`
2. Server สร้าง Stripe Checkout Session (lookup key)
3. Webhook `checkout.session.completed` → อัปเดต `subscriptions` + tier sync

### Pro+ / In-House

- Pro+ ปลดล็อก ecosystem features (LINE, storage แยก, AI credits ร่วม)
- In-House: per-seat billing, min 2 / max 50 seats → `sync_inhouse_org_seat_limit` RPC

### PX top-up (Anthem)

1. User กดเติมที่ `/earnings`
2. Checkout ด้วย `px_*` lookup key
3. Webhook → `topup_wallet_stripe` RPC (idempotent ด้วย `stripe_session_id`)

### Stripe Connect cashout

1. Creator onboard ที่ `/earnings` → `/api/payments/connect/onboard`
2. Admin อนุมัติที่ `/admin/gifts` → `processCashoutTransfer`
3. สถานะ `processing` → `paid` / `failed`

### Client job payment (ลูกค้าชำระมัดจำ/งวดสุดท้าย)

1. ฟรีแลนซ์เชื่อม Connect ที่ **Settings → รับชำระออนไลน์จากลูกค้า** (หรือ an1hem `/earnings`)
2. ลูกค้าเปิด `/track/:token` → **ดูรายละเอียดและชำระ** → `/track/:token/checkout?payment=deposit|final`
3. หน้า review แสดงรายการจากใบเสนอราคา + ค่าธรรมเนียม card (ลูกค้ารับ fee)
4. Redirect Stripe Checkout → Connect destination (ฟรีแลนซ์ได้ยอดงานเต็ม)
5. Webhook `client_job` → `fulfill_client_job_payment_stripe` (mark `deposit_paid` / `final_paid`)

**Gating:** Connect complete + payouts enabled + `stripe_client_payments_enabled` — **ทุก tier**

SQL: `supabase/migrations/20250617000000_stripe_client_payments.sql`

ดูรายละเอียด KYC/AML cashout: [Anthem-Code/docs/aml-compliance.md](../../Anthem-Code/docs/aml-compliance.md)

SQL (PX/credits): `scripts/ecosystem/stripe-payments.sql`

## Sandbox setup

1. สร้าง Stripe test account
2. **เปิด Connect (จำเป็นก่อนสร้าง Express account):** [Dashboard → Connect (Test)](https://dashboard.stripe.com/test/connect/overview) → Get started / Complete platform setup
3. ใส่ `STRIPE_SANDBOX_API_KEY` ใน `Solo-Code/.env`
3. รัน `npm run stripe:sync`
4. ตั้ง webhook ใน Stripe Dashboard → endpoint ด้านบน
5. ใส่ `VITE_PAYMENTS_CLIENT_TOKEN=pk_test_...` ทั้ง So1o และ Anthem (ถ้าใช้ shared checkout)

Claim instructions: `scripts/stripe/SANDBOX_CLAIM.txt`

## QA

```bash
# Automated (ใน ecosystem full test)
./scripts/test-ecosystem-full.sh   # รวม stripe:verify

# Manual
# - /pricing → Pro checkout (sandbox card 4242...)
# - Anthem /earnings → PX top-up → ?topup=success
# - Admin /admin/gifts → cashout transfer (test account)
```

## เอกสารที่เกี่ยวข้อง

- [vercel-demo-deploy.md](./vercel-demo-deploy.md) — env สำหรับ demo deploy
- [ecosystem-notifications.md](../../docs/ecosystem-notifications.md) — email/LINE หลัง topup/cashout
- [aml-compliance.md](../../Anthem-Code/docs/aml-compliance.md) — wallet + cashout rules

# Stripe — Subscriptions, AI Credits, Solo Job Payments (So1o only)

> **Scope:** So1o Freelancer product only.  
> **Aplus1 (Anthem) does not use Solo as a billing hub.** New Aplus1 fiat flows use Omise — see `Anthem-Code/docs/payments-omise.md`.  
> Do not add new Anthem → Solo `/api/payments/*` integrations.

So1o billing: Stripe Checkout + webhooks on So1o server routes.

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
| `STRIPE_USE_DIRECT` | `true` = เรียก Stripe API ตรง |
| `VITE_STRIPE_ENV` | `sandbox` / `live` |
| `VITE_SITE_URL` | redirect หลัง checkout |

Webhook:

```
https://solofreelancer.com/api/public/payments/webhook?env=sandbox
```

## Catalog (So1o)

Subscriptions: `pro_*`, `pro_plus_*`, `inhouse_*`  
AI credits: `credits_*`  

Legacy Anthem lookup keys (`px_*`, `boost_*`, `ad_*`) may still exist on the webhook for old rows — **do not start new Aplus1 volume here**.

## Flows (So1o)

1. Subscription checkout at `/pricing`
2. Client job pay via `/track/:token/checkout` + Connect destination
3. Escrow helpers remain for Solo/legacy ops only

## Aplus1 boundary

| Do | Don't |
|----|-------|
| Keep Solo Stripe for Solo product | Call Solo payment APIs from new Anthem features |
| Point Anthem fiat to Omise docs | Assume Anthem depends on Solo Connect forever |

See: `Anthem-Code/docs/payments-omise.md`

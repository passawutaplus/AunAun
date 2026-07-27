# ANTHEM_PAYMENTS_SKILL

ใช้เมื่อแก้เงินฝั่ง Aplus1 (Anthem): Payso (commercial) / Omise-named code paths, hire pay, ledger, payout, FX display, cashout, top-up

## Source of truth

- [payments-omise.md](../payments-omise.md)
- [aml-compliance.md](../aml-compliance.md) — PX only

## Hard rules

1. **Do not** call Solo/So1o `/api/payments/*`, Connect onboard, or Stripe Checkout from Anthem for new flows.
2. **Commercial PSP:** Payso (see [payments-omise.md](../payments-omise.md)). Code may still use `Omise` / `OMISE_*` names until cutover — secrets stay server-side.
3. **PX ≠ FX.** Display currency (THB/USD) is for job/portfolio/checkout labels only.
4. Ledger amounts are **integer satang (THB)**. Snapshot platform fee on order create.
5. Payment webhook success credits **pending**, never **available**, until client/auto approve.
6. Live charge/transfer requires marketplace/live flags (`OMISE_MARKETPLACE_APPROVED=true` or successor) and live flags.
7. Hire cancel money terms must eventually map to ledger/PSP refund — do not pretend text-only is settlement forever without documenting the gap.
8. Creator payout timing must respect Payso **T+7** merchant settlement — do not promise same-day bank credit ignoring settlement.

## Red flags

- Importing `stripePaymentsApi` for new features
- Floating-point money math
- Trusting client amount/status
- Calling PX conversion “currency change”
- Exposing Omise secret in Vite

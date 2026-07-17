# Solo Payment Security Skill

## Purpose

ใช้เมื่อแก้ **So1o (Solo-Code) เท่านั้น**:

- Stripe (Solo subscriptions, AI credits, job client pay)
- Solo payment routes / webhooks
- Solo escrow / Connect (legacy helpers)
- invoice/payment reminders

**Aplus1 (Anthem) payments are out of scope.**  
Use `Anthem-Code/docs/payments-omise.md` + `ANTHEM_PAYMENTS_SKILL.md`.  
Do not add Anthem → Solo `/api/payments/*` as the Aplus1 money path.

## Security Principle

- client input ไม่น่าเชื่อถือ
- webhook ต้อง verify
- operation ต้อง idempotent
- balance จาก trusted source
- failure ต้อง recover ได้

## Stripe Rules (Solo)

- verify webhook signature
- never trust amount from client without server validation
- idempotency keys for sensitive ops
- store external Stripe IDs
- handle duplicate webhooks and failed/expired states
- never leak secrets in logs/UI

## Cashout / Connect (legacy where still used)

- minimum enforced server-side
- earned/withdrawable only
- KYC requirements enforced
- no double-spend on concurrent requests

## Escrow

- separate buyer pay vs freelancer release states
- explicit transitions
- **New Aplus1 hire money = Omise + Aplus1 ledger**, not expanded Solo escrow

## Red Flags

- amount only from client
- unverified webhook
- secret exposed
- new Anthem feature depends on Solo payment hub

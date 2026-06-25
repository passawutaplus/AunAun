# Solo Payment Security Skill

## Purpose

ใช้เมื่อแก้:

- Stripe
- payment route
- webhook
- cashout
- escrow
- transfer
- wallet/balance
- invoice/payment reminders

## Security Principle

Solo ต้องถือว่า payment เป็น high-risk surface ทุกครั้ง:

- client input ไม่น่าเชื่อถือ
- webhook ต้อง verify
- operation ต้อง idempotent
- balance ต้องคำนวณจาก trusted source
- failure ต้อง recover ได้

## Stripe Rules

- verify webhook signature
- never trust amount from client without server validation
- use idempotency key for create/transfer/cashout-sensitive operations
- store external Stripe IDs
- handle duplicate webhook delivery
- handle failed/expired/canceled payment states
- log enough for support without leaking secret

## Cashout Rules

- enforce minimum server-side/database-side
- only earned/withdrawable balance counts
- welcome/demo/non-withdrawable credits excluded
- KYC/Stripe Connect requirement enforced
- one active cashout request should not double-spend
- admin/manual review if suspicious

## Escrow / Marketplace Rules

- buyer payment and freelancer payout are separate states
- do not release funds until required conditions pass
- status transitions must be explicit
- user cannot mutate another user's escrow/job
- cancellation/refund path documented

## Rate Limiting

Payment-related endpoints need rate limit:

- create checkout
- claim/cashout
- webhook not rate-limited in a way that blocks Stripe, but must verify signature
- auth-sensitive payment routes

## Idempotency

Use stable keys based on:

- user id
- payment id
- order/request id
- action type

Do not use random key for retryable operation if retry should map to same action

## Database Rules

- ledger append-only where possible
- balance derived from ledger or updated atomically
- unique constraints for external event IDs
- transaction around balance mutation
- store failure reason/status

## UI Rules

- show payment status clearly
- show cashout eligibility
- disable submit while processing
- avoid "success" until server confirms
- show recoverable error message
- never show raw Stripe/Supabase internal errors

## Tests

Required test cases:

- duplicate webhook does not duplicate balance
- duplicate cashout request blocked
- insufficient balance blocked
- welcome px excluded
- invalid amount blocked
- payment route rate limited
- another user's payment data inaccessible

## Red Flags

Stop if:

- amount comes only from client
- idempotency removed
- cashout uses total balance instead of earned
- webhook not verified
- payment route leaks secret
- failed payment is treated as paid
- balance update is not atomic

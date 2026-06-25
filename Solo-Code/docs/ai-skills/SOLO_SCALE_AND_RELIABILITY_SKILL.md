# Solo Scale and Reliability Skill

ใช้เมื่อเตรียม Solo ให้รองรับปริมาณงาน เงิน ลูกค้า workspace และ operation ที่เพิ่มขึ้น

## Goal

Solo ต้อง scale แบบ reliable เพราะเกี่ยวข้องกับ:

- payment
- cashout
- client/freelancer workflow
- in-house workspace
- admin operation
- audit logs

## Reliability Priorities

1. เงินต้องถูกต้องก่อนเร็ว
2. operation ต้อง recover ได้
3. webhook/queue ต้อง idempotent
4. admin ต้องเห็น failure และแก้ไขได้
5. dashboard ต้องเร็วพอแม้ข้อมูลเยอะ

## Payment Throughput

เมื่อ transaction เพิ่ม:

- webhook duplicate จะเกิดบ่อยขึ้น
- retry/failure จะเยอะขึ้น
- user จะกดซ้ำมากขึ้น
- support ต้อง trace payment ได้

Checklist:

- [ ] webhook signature verified
- [ ] event id unique
- [ ] payment status state machine ชัด
- [ ] transfer/cashout idempotent
- [ ] failure reason stored
- [ ] admin/support lookup by Stripe id ได้

## Cashout Queue

เมื่อ cashout เยอะขึ้น:

- ไม่ควร process ทุกอย่างแบบ synchronous ถ้าช้า
- ต้องมี pending/reviewing/approved/paid/failed state
- suspicious cashout ต้อง manual review
- balance ต้อง reserve หรือ lock เพื่อกัน double spend

Checklist:

- [ ] minimum earned balance enforced
- [ ] welcome/non-withdrawable excluded
- [ ] one active request does not double spend
- [ ] admin review path
- [ ] payout failure recovery
- [ ] audit trail

## Dashboard Scaling

Dashboard ไม่ควร query ทุกอย่างพร้อมกันแบบหนัก:

- ใช้ summary endpoint/RPC
- paginate list
- lazy load secondary tabs
- cache low-risk aggregates
- avoid fetching all historical rows

Checklist:

- [ ] dashboard cards query เบา
- [ ] tables paginate/filter
- [ ] date range default sane
- [ ] empty/error states clear
- [ ] no client-side filtering huge datasets

## In-house Workspace Scaling

เมื่อ org/workspace/task/chat โต:

- query ต้อง filter org/workspace เสมอ
- task list paginate/filter
- chat paginate
- unread count efficient
- role permission cached/checked safely

Checklist:

- [ ] org boundary enforced
- [ ] workspace boundary enforced
- [ ] member role validated server-side
- [ ] chat does not load all history
- [ ] task list has status/assignee filters
- [ ] settings update admin-only

## Admin/Ops Load

Admin tools ต้องรองรับ:

- search/filter
- status queue
- batch actions with audit
- CSV export with limits
- fraud/risk review
- payment lookup

Checklist:

- [ ] admin pages have pagination
- [ ] export limited/safe
- [ ] action confirmation
- [ ] audit trail
- [ ] role guard server-side

## Background Jobs

พิจารณา queue/background job เมื่อ:

- sending many emails/notifications
- processing payouts
- generating PDFs
- syncing external APIs
- recalculating large analytics

Rules:

- job idempotent
- retry safe
- failure visible
- no duplicate money movement

## Monitoring Signals

Track:

- payment creation failures
- webhook failures
- duplicate webhook count
- cashout pending age
- payout failure rate
- dashboard load time
- Supabase slow queries
- admin action failures
- org permission errors

## Incident Plan

Payment incident:

1. pause risky endpoint if needed
2. identify affected ledger/payment ids
3. stop duplicate processing
4. reconcile with Stripe
5. patch idempotency/state machine
6. document root cause

Workspace/data incident:

1. identify affected org/user
2. block leaked route/query
3. verify RLS/policy
4. audit logs
5. notify if required

## AI Instructions

ถ้า AI แตะ Solo scaling ต้องตอบ:

1. Does this touch money?
2. Is it idempotent?
3. What happens on retry?
4. What happens on duplicate webhook/request?
5. What table grows fastest?
6. Is there pagination?
7. Can admin recover from failure?


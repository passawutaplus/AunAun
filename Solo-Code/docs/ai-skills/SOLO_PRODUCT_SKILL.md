# Solo Product Skill

## Product Definition

Solo คือระบบสำหรับ freelance/business operations ที่ช่วยให้ freelancer, creator หรือทีมเล็กจัดการงาน ลูกค้า เงิน เอกสาร และ workflow ได้ปลอดภัยขึ้น

Solo แตกต่างจาก Anthem:

- Anthem = community/discovery/creator growth
- Solo = business operations/payment/work management

## Core Promise

> ช่วยให้ freelancer และทีมเล็กจัดการงาน เงิน และ operation ได้เป็นระบบ โดยลดความเสี่ยงเรื่อง payment และ workflow

## Primary Users

- freelancer ที่รับงานจริง
- creator ที่เริ่มมีรายได้
- client/hiring party
- small studio/team
- internal admin/ops

## Core Product Areas

1. Dashboard
   - ภาพรวมงาน รายได้ ลูกค้า action ที่ต้องทำ

2. Payment and Cashout
   - Stripe
   - escrow/transfer
   - cashout
   - invoice/fees/tax-related utility

3. Marketplace / Hiring
   - request
   - escrow
   - client/freelancer workflow

4. In-house Workspace
   - organization
   - workspace
   - tasks
   - chat
   - monitor/canvas/settings

5. Admin / Ops
   - support
   - reports
   - security/usage monitoring

## Product Priorities

### Must Protect

- payment correctness
- cashout safety
- user data privacy
- role and organization permissions
- production deploy stability

### Must Simplify

- dashboard scan
- payment status
- next action
- task ownership
- client/freelancer communication

## UX Rules for Solo

- Dense but organized
- Dashboard should be scannable
- Payment/cashout copy must be precise
- Avoid decorative marketing layout in operational views
- Use tables, filters, tabs, status badges, clear forms
- Every money action should have confirmation and audit trail

## Key Risks

- duplicate payment/transfer
- cashout with wrong balance
- Stripe webhook mismatch
- rate-limit bypass
- user seeing another user's private data
- organization member permission leak
- hydration/SSR mismatch causing broken dashboard

## Metrics

- successful payment flow
- cashout request success/fail reason
- dashboard task completion
- support/report rate
- payment endpoint errors
- in-house workspace active usage
- build/deploy health

## AI Rules

- Do not treat Solo like a creator community feed
- Do not simplify payment logic by removing guards
- Do not trust client amount/status
- Do not make admin/ops UI too decorative
- Do not hide errors that affect money
- Do not change Stripe/Supabase env names casually

## Before Large Changes Ask

1. Does this touch money?
2. Does this require idempotency?
3. Does this expose org/user private data?
4. Is there an audit trail?
5. Can an admin recover from failure?
6. Does dashboard still show next action clearly?

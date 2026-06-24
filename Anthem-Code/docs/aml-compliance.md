# AML & Gifting Compliance (Anthem)

เอกสารอ้างอิงสำหรับทีม ops / admin — สอดคล้องกับ migration `20260530121450`, `scripts/ecosystem/stripe-payments.sql` และ `.lovable/plan.md`

## โครงสร้าง PX (closed-loop)

| ช่อง wallet | ที่มา | ใช้ทำอะไร | Cashout |
|-------------|--------|-----------|---------|
| `welcome_px` | ภารกิจ Welcome Bonus (สูงสุด 100 px) | ส่งของขวัญ | ไม่ได้ |
| `purchased_px` | เติมเงิน (Stripe Checkout ผ่าน So1o) | ส่งของขวัญ | ไม่ได้ |
| `earned_px` | รับของขวัญ | ถอนเป็นบาท | ได้ (หลัง KYC + Connect, ขั้นต่ำ 1,000 px) |

- Welcome Bonus ปลดล็อกทีละภารกิจ onboarding — RPC `claim_welcome_mission` (เพดาน `lifetime_welcome_px` = **100**)
- ส่งของขวัญหัก `welcome_px` ก่อน `purchased_px` — ยอดรวมพร้อมใช้ = `available_gift_px`
- ยอด top-up **ใช้ส่ง gift ได้ทันที** (`hold_hours = 0`) — ไม่มีช่วงพัก 24 ชม.
- `balance_px` = `purchased_px + earned_px` (generated) — welcome_px แยกจาก balance รวม

## Stripe top-up (PX)

- Checkout รวมศูนย์ที่ **So1o** (`/pricing` หรือ `/api/payments/checkout`) — lookup keys `px_500`, `px_2000`, `px_10000`
- Webhook `checkout.session.completed` → RPC `topup_wallet_stripe` (idempotent ด้วย `stripe_session_id`)
- Anthem UI: `/earnings` → TopUpDialog → redirect Stripe → กลับ `?topup=success`
- ปิด mock: ตั้ง `payment_settings.mock_topup_enabled = false` (production)

## Limits (ค่าเริ่มต้นใน `gift_limits_config`)

- ไม่ verify: ส่ง gift รวม ≤ 500 px/วัน
- verify แล้ว: ≤ 5,000 px/วัน
- velocity: ≤ 10 gifts/ชม.
- max top-up/ครั้ง: 100,000 px
- บัญชีอายุ ≥ 1 ชม. ก่อนส่ง gift

## KYC

- ผู้ใช้ส่งคำขอที่ `/verify` → `kyc_requests` (pending)
- Admin อนุมัติที่ `/admin/kyc` → `profiles.is_verified = true`
- **Cashout ต้อง verify** — RPC `request_cashout` จะ reject ถ้ายังไม่ verify

## AML flags (`aml_flags`)

| flag_type | ความหมาย |
|-----------|----------|
| `velocity` | ส่ง gift ถี่เกิน |
| `circular_transfer` | A↔B ส่งกลับภายใน 7 วัน |
| `new_account_burst` | รับจากหลาย sender บัญชีใหม่ |
| `large_amount` | มูลค่าสูง (ถ้ามี rule) |
| `self_network` | รูปแบบเครือข่ายตนเอง |

Admin จัดการที่ `/admin/aml`: dismiss / escalate / freeze

## Cashout workflow (Stripe Connect)

1. ผู้ใช้ onboard Connect ที่ `/earnings` → So1o `/api/payments/connect/onboard`
2. ผู้ใช้ขอถอนที่ `/earnings` → `cashout_requests.status = pending` (หัก `earned_px`)
3. **ค่าธรรมเนียม:** Free **15%** · Pro/Pro+/In-House **10%** (`cashout_platform_fee_pct`)
4. Admin ที่ `/admin/gifts` → **โอน Stripe** → `processCashoutTransfer` → `stripe.transfers.create`
4. สถานะ `processing` → `paid` (หรือ `failed` + คืน `earned_px` ผ่าน `mark_cashout_failed_stripe`)
5. Fallback manual: `admin_mark_cashout_paid` (sandbox / edge cases)

## ก่อน go-live (checklist)

- [x] Stripe Checkout top-up (`topup_wallet_stripe`)
- [x] Stripe Connect cashout path
- [ ] ตั้ง `payment_settings.mock_topup_enabled = false` ใน production
- [ ] Webhook secrets + products ใน Stripe Dashboard (sandbox แล้ว → live)
- [ ] KYC อัปโหลดเอกสาร (storage private)
- [ ] ทบทวน `docs/security.md` และ pentest scope

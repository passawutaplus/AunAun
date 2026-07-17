# AML & Gifting Compliance (Anthem)

เอกสารอ้างอิงสำหรับทีม ops / admin  

**Fiat / hire payments:** ดู [payments-omise.md](./payments-omise.md) — Aplus1 ใช้ **Omise + internal THB ledger** ไม่พึ่ง So1o เป็น billing hub  

**PX:** closed-loop ในเว็บเท่านั้น — **ไม่ใช่**ระบบเปลี่ยนค่าเงิน (FX display)

Legacy SQL อ้างอิง: `scripts/ecosystem/stripe-payments.sql` (เส้นทางเก่าผ่าน Solo — **deprecated สำหรับ Aplus1 ใหม่**)

## โครงสร้าง PX (closed-loop)

| ช่อง wallet | ที่มา | ใช้ทำอะไร | Cashout เป็นเงินจริง |
|-------------|--------|-----------|----------------------|
| `welcome_px` | ภารกิจ Welcome Bonus (สูงสุด 100 px) | ส่งของขวัญ | ไม่ได้ |
| `purchased_px` | เติม PX (เดิม Stripe ผ่าน So1o — กำลังย้ายออก) | ส่งของขวัญ | ไม่ได้ |
| `earned_px` | รับของขวัญ | ถอนเป็นบาทผ่านนโยบาย Aplus1 (Omise) หลัง KYC | ได้เมื่อระบบ payout พร้อม |

- Welcome Bonus: RPC `claim_welcome_mission` (เพดาน `lifetime_welcome_px` = **100**)
- ส่งของขวัญหัก `welcome_px` ก่อน `purchased_px` — `available_gift_px`
- `balance_px` = `purchased_px + earned_px` (generated)

## เติม PX (สถานะ)

| สถานะ | รายละเอียด |
|--------|------------|
| **เป้าหมาย** | Top-up PX ผ่าน Aplus1 + Omise (หรือปิด top-up จนกว่าพร้อม) — **ไม่เรียก Solo `/api/payments/checkout`** |
| **Legacy** | So1o Checkout `px_*` → webhook → `topup_wallet_stripe` — ใช้เฉพาะรายการเก่า / ปิดรับรายการใหม่จาก Anthem |

- UI: `/earnings` — ถ้า payments ยังไม่พร้อม แสดงสถานะปิดชั่วคราว
- ปิด mock: `payment_settings.mock_topup_enabled = false` (production)

## Limits (`gift_limits_config`)

- ไม่ verify: gift ≤ 500 px/วัน  
- verify แล้ว: ≤ 5,000 px/วัน  
- velocity: ≤ 10 gifts/ชม.  
- max top-up/ครั้ง: 100,000 px  
- บัญชีอายุ ≥ 1 ชม. ก่อนส่ง gift  

## KYC

- `/verify` → `kyc_requests`  
- Admin `/admin/kyc` → `profiles.is_verified`  
- **Cashout / THB payout ต้อง verify**

## AML flags (`aml_flags`)

| flag_type | ความหมาย |
|-----------|----------|
| `velocity` | ส่ง gift ถี่เกิน |
| `circular_transfer` | A↔B ส่งกลับภายใน 7 วัน |
| `new_account_burst` | รับจากหลาย sender บัญชีใหม่ |
| `large_amount` | มูลค่าสูง |
| `self_network` | รูปแบบเครือข่ายตนเอง |

Admin: `/admin/aml`

## Cashout / ถอนเงิน

### เป้าหมาย (Aplus1 Omise)

1. ผู้รับงานมีบัญชีธนาคารที่ verify แล้ว (Omise Recipient)  
2. ยอด **THB available** จาก hire ledger (ไม่ใช่แค่ earned_px อย่างเดียวในระยะยาว)  
3. นโยบาย Aplus1 Payout: ขั้นต่ำ 1,000 THB, ฟรี 1 ครั้ง/เดือน, ครั้งถัดไป 25 THB; auto weekly + EOM sweep — ดู [payments-omise.md](./payments-omise.md)  
4. Admin คิว payout ใน Aplus1 — **ไม่** `processCashoutViaStripe` / Solo Connect  

### Legacy (deprecated)

1. Connect onboard ผ่าน So1o  
2. `cashout_requests` + Stripe Transfer จาก Admin Gifts  
3. ใช้เฉพาะเคลียร์คิวเก่า — ห้ามเปิดรับใหม่จาก Anthem UI  

## สกุลเงินแสดงผล vs PX

- **เปลี่ยนค่าเงิน** = แสดงราคาจ้าง / ลงผลงาน / checkout เป็น THB หรือ USD (เรท admin + snapshot)  
- **PX** ไม่แปลงผ่านระบบ FX  

## ก่อน go-live (checklist)

- [x] ตัด Anthem → Solo payment API ครบ (client refuse + escrow Solo URL ปิด)  
- [ ] Omise test mode charge + webhook บน Aplus1  
- [ ] `OMISE_MARKETPLACE_APPROVED=true` หลัง Omise อนุมัติรูปแบบ marketplace  
- [ ] Internal ledger + hire pay → pending → available (schema + domain helpers พร้อม — รอ apply SQL + live wiring)  
- [ ] `payment_settings.mock_* = false` ใน production  
- [ ] KYC + recipient verification  
- [ ] ทบทวน security / pentest scope  

# Anthem AML & Fraud Prevention System

ป้องกันการฟอกเงินผ่าน Gifting + Cashout แบบครบ stack — backend guardrails, KYC verification flag, risk scoring, และ admin freeze controls

---

## 1. Database — Schema Changes (migration เดียว)

### 1.1 `profiles` เพิ่ม fields
- `is_verified boolean default false` — สถานะ KYC
- `verified_at timestamptz`, `verified_by uuid` — admin ที่ verify
- `account_status text default 'active'` — `active | frozen | under_review`
- `frozen_at timestamptz`, `frozen_reason text`
- `risk_score int default 0` — 0-100 (คำนวณจาก trigger)

### 1.2 `wallets` แยก balance เป็น 2 ช่อง (closed-loop)
- `purchased_px int default 0` — มาจาก topup → ใช้ส่ง gift ได้ แต่ **cashout ไม่ได้**
- `earned_px int default 0` — มาจาก gift ที่รับมา → cashout ได้
- `balance_px` กลายเป็น generated column = `purchased_px + earned_px`
- Migrate: ยอดเดิมทั้งหมดย้ายไป `purchased_px` (ปลอดภัยที่สุด)

### 1.3 `wallet_topups` เพิ่ม holding
- `available_at timestamptz` = `created_at + 24h` — px นี้ใช้ส่ง gift ไม่ได้จนกว่าจะถึงเวลา

### 1.4 ตารางใหม่
- **`gift_limits_config`** (1 row) — daily_limit_unverified=500, daily_limit_verified=5000, velocity_per_hour=10, hold_hours=24, min_account_age_hours=1
- **`aml_flags`** — log การ flag อัตโนมัติ: `user_id, flag_type, severity, details jsonb, status, reviewed_by, reviewed_at` (flag_types: `velocity`, `circular_transfer`, `new_account_burst`, `large_amount`, `self_network`)
- **`kyc_requests`** — `user_id, status (pending|approved|rejected), submitted_at, reviewed_at, reviewed_by, admin_note` — ไม่เก็บไฟล์บัตรประชาชน (manual verify เท่านั้น)

### 1.5 RLS + Grants
- ผู้ใช้อ่าน wallet/limits ของตัวเองได้, admin อ่านได้หมด
- `aml_flags` admin-only
- `kyc_requests` เจ้าของอ่าน+insert ของตัวเอง, admin update

---

## 2. RPC Functions (SECURITY DEFINER)

### 2.1 แก้ `send_gift` ให้เช็คทุกชั้น
ลำดับการตรวจสอบ (fail fast):
1. ไม่ frozen, ไม่ under_review
2. ผู้รับไม่ frozen
3. account อายุ ≥ 1 ชม. (กัน burst account)
4. ยอด available (= purchased_px ที่ผ่าน holding period แล้ว) เพียงพอ
5. ไม่เกิน daily limit (500 หรือ 5000 ตาม `is_verified`)
6. ไม่เกิน velocity 10 gifts/ชม.
7. ตรวจ circular pattern: ถ้า A → B และ B เคย → A ภายใน 7 วัน → log `aml_flags` (ไม่ block แค่ flag)
8. ตัด `purchased_px` ผู้ส่ง, บวก `earned_px` ผู้รับ

### 2.2 แก้ `request_cashout`
- เช็คเฉพาะ `earned_px` (ไม่ใช่ balance_px)
- min 1000 px คงเดิม, fee 15% คงเดิม
- เพิ่ม: ถ้า `is_verified = false` → reject พร้อมข้อความ "ต้อง verify ก่อน cashout"

### 2.3 ฟังก์ชันใหม่
- `available_purchased_px(uid)` — return ยอด topup ที่ผ่าน holding แล้ว
- `daily_gift_total(uid)` — รวมยอดส่งวันนี้
- `submit_kyc_request()` — สร้าง pending request
- `admin_approve_kyc(uid, note)` — ตั้ง `is_verified=true`
- `admin_freeze_account(uid, reason)`, `admin_unfreeze_account(uid)`
- `admin_resolve_aml_flag(flag_id, action)` — `dismiss | escalate | freeze`
- `calculate_risk_score(uid)` — คะแนนรวมจาก: account_age (น้อย=เสี่ยง), velocity 7d, % gift ไป unique recipients ที่ใหม่, จำนวน flags

---

## 3. Triggers (auto-monitoring)

- **after insert on `gift_transactions`**: เรียก `detect_velocity_burst()` — ถ้า sender ส่ง >10 ครั้ง/ชม. → insert `aml_flags` severity=high
- **after insert on `gift_transactions`**: ถ้า recipient รับจาก ≥5 sender ที่ created < 24h → flag `new_account_burst`
- **after update on `aml_flags`**: ถ้า severity=critical และ status=open → auto-set `account_status='under_review'`

---

## 4. Frontend — User-facing

### 4.1 `DonationModal` (แก้)
- แสดง daily limit ที่เหลือ + ยอด available (แยก purchased pending hold)
- ถ้าเหลือยอดต่ำกว่า gift → กดไม่ได้ + แนะนำให้ verify
- เพิ่ม disclaimer: "ธุรกรรมนี้อยู่ภายใต้การตรวจสอบเพื่อความปลอดภัย การใช้ผิดวัตถุประสงค์อาจถูกระงับบัญชีถาวร"

### 4.2 `TopUpDialog` (แก้)
- แสดง "ยอดนี้พร้อมใช้ส่งของขวัญหลังจาก 24 ชม."
- ลด max ต่อครั้งจาก 1M → 100k px

### 4.3 `WalletBadge` + `EarningsPage`
- แยกแสดง 3 ตัวเลข: Available / Pending hold / Earned (cashout-eligible)
- Verified badge ที่ profile (เช็ค `is_verified`)

### 4.4 หน้าใหม่
- **`/verify`** (VerificationPage) — แสดงสถานะ KYC, ปุ่ม "ขอ verify บัญชี" → สร้าง `kyc_requests` pending, อธิบายว่า admin จะติดต่อกลับ
- `ProfileMenuCard` + `SettingsPage` เพิ่มลิงก์ "ยืนยันตัวตน"

### 4.5 Toasts & error mapping
- map error codes จาก RPC (`LIMIT_EXCEEDED`, `VELOCITY`, `HOLDING_PERIOD`, `ACCOUNT_FROZEN`, `KYC_REQUIRED`) เป็นข้อความไทยชัดเจน

---

## 5. Admin Dashboard — หน้าใหม่/แก้

### 5.1 `/admin/aml` (ใหม่)
- KPI: pending flags, frozen accounts, under_review, high-risk users (score≥70)
- Tabs: **Flags** (list `aml_flags` + filter severity/type, action: dismiss/escalate/freeze) / **Frozen Accounts** (unfreeze) / **High Risk** (risk_score sorted)
- Transaction explorer: ค้นหา gift_transactions ด้วย sender/recipient + แสดง risk score ของทั้งคู่

### 5.2 `/admin/kyc` (ใหม่)
- List `kyc_requests` pending → approve/reject พร้อม note
- เมื่อ approve → set `is_verified=true`, log audit

### 5.3 `AdminUsersPage` (แก้)
- เพิ่มคอลัมน์: status badge (active/frozen/review), risk score, verified flag
- Inline action: freeze/unfreeze, force verify
- Risk score sort

### 5.4 `AdminGiftsPage` (แก้)
- เพิ่มคอลัมน์ "Risk" ต่อ transaction (สูง = แดง)
- Filter: high-risk only

---

## 6. Audit & Compliance
- ทุก admin action (freeze/unfreeze/approve KYC/dismiss flag) → insert `admin_audit_log`
- เพิ่ม `docs/aml-compliance.md` — อธิบายโครงสร้าง, limits, escalation flow

---

## 7. Mock Data Update
- 1-2 users ใน 20 mock ตั้งเป็น `is_verified=true`
- สร้าง 3-4 `aml_flags` ตัวอย่าง (velocity, new_account_burst) เพื่อให้ admin dashboard มีข้อมูลทดสอบ
- 2 `kyc_requests` pending

---

## สิ่งที่ **ไม่อยู่** ใน plan นี้ (deferred)
- KYC upload จริง (บัตรประชาชน + storage) — รอ payment infra
- Payment integration จริง (Stripe/Omise) + 3DS — phase ถัดไป
- Rate limiting infrastructure (ใช้ DB-level check แทน)
- SMS/Email OTP สำหรับ high-value transactions

---

## ขอบเขตการแก้ไฟล์ (โดยประมาณ)
- 1 migration ใหญ่ (schema + RPC + triggers + RLS)
- ~5 hooks ใหม่/แก้: `useWallet`, `useGifting`, `useKyc`, `useAmlFlags`, `useAccountStatus`
- ~4 components แก้: `DonationModal`, `TopUpDialog`, `WalletBadge`, `ProfileMenuCard`
- ~4 หน้าใหม่: `VerificationPage`, `AdminAmlPage`, `AdminKycPage` (+ sidebar entry)
- 2 หน้า admin แก้: `AdminUsersPage`, `AdminGiftsPage`
- 1 doc ใหม่: `docs/aml-compliance.md`

อนุมัติแล้วผมจะเริ่มจาก migration → RPC → frontend → admin → mock data ครับ
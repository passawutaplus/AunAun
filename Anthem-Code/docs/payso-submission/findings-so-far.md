# Payso submission — findings so far (2026-10-09)

Status: **audit started, pack not built yet.** Everything below was read from code, docs or the live database (read-only).

## Facts confirmed
- Commercial PSP is Payso (บริษัท เพย์ โซลูชั่น จำกัด), quotation `Q-202607000297` (valid to 31 Oct 2026). Code still uses `OMISE_*` names. Source: `docs/payments-payso.md`.
- Payso limits for an **individual** merchant: ≤ 50,000 THB per month, ≤ 20,000 THB per transaction. Settlement weekly (T+7). Rates (excl. VAT): PromptPay 1.35% (min 5 THB), card 3% (AMEX 4%).
- Money model: Aplus1 is a payment intermediary; hire money is held for the seller; Aplus1 revenue is the 10% platform fee only. Fee is a snapshot at order creation; money math is integer satang.
- Lifecycle: quote (48 h expiry) → buyer accepts policies → checkout (PromptPay / card, full or deposit) → webhook marks paid → seller submits work → buyer approves (7-day dispute window) → pending becomes available → payout (min 1,000 THB, 1 free per month, then 25 THB, KYC and verified bank account required).
- Refund policy (answers Payso item 11) already exists at `/legal/payment-refund` (`src/pages/legal/PaymentRefundPage.tsx`): money held until approval; same-day cancel is fastest; ≤ 7 days and work not started → job amount refunded, no late-cancel fee; after 7 days or work started → case review, possible deduction; refunds 7–14 business days (card 14–30); dispute before approval holds the money; chargebacks outside the process can limit refund rights.
- Production state (live DB, 2026-10-09): `hire_orders` has **0 rows** (no real transaction has ever run); payment flags: `omise_payments_enabled=false`, `live_marketplace_payments_enabled=false`, `auto_payout_enabled=false`, `bank_transfer_enabled=false`, manual payout on. 13 KYC documents exist.
- Admin finance functions the payout operation needs are **missing from the database** (`admin_finance_overview`, `admin_retry_failed_payout`, `admin_resolve_dispute`, `admin_verify_recipient`, …) — see `docs/db-drift-2026-10-07.md`. Do not claim a working finance back office to Payso until these are ported.
- Test-mode payment (PromptPay on a Vercel preview) has not been run by the owner yet.

## Still to do for the pack
1. Read and document the quote → checkout → order → delivery → payout code paths (`ChatOfferDialog`, `HireCheckoutDialog`, `createHireOrderAfterPayment`, `useHireOrderFlow`, `payoutPolicy`).
2. Wallet / PX, gifts, top-up and cash-out; the object shop (`api/object-charge.js`, on branch `wip/cursor-2026-10-09`, not merged); packages and boosts.
3. KYC flow and the personal-data inventory (name, address, phone, email, bank, ID, selfie, date of birth, PEP/sanctions declarations): fields in `kyc_requests`, `kyc_documents`, `payout_profiles`, `profiles`; where stored; who can read; retention.
4. Build the PDF (HTML → Edge headless print, Thai text) with a screenshot shot-list the owner follows, and the checklist for Payso items 4–15 with ready-made answers for items 11 and 14.
5. Apply the pending SQL (`Solo-Code/supabase/manual/apply-2026-10-09/`), then move the 13 KYC documents to the private bucket before sending anything to Payso.

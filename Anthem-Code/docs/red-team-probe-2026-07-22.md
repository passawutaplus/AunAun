# Red-team defense probe results (2026-07-22)

Run: `SELECT * FROM public._security_defense_probe_lab();` (service / SQL editor)

## Passed (blocked as intended)
- A1/A2 wallet PX IDOR
- A3 force_purge
- A4 email / base-table cross-user
- A4c profiles_public directory still works
- A5 paid hire_order insert
- A8 confirm with fake chrg_
- A9 auto_grant removed
- B1-B4 money tables permission denied for authenticated direct read
- C1 send_gift welcome→welcome source
- C2/C3 grants revoked

## Found & fixed during probe
- anon SELECT on shared money tables (no RLS) → revoked + RLS enabled
- `fulfill_escrow_payment_stripe` / `fulfill_client_job_payment_stripe` executable by anon without authz → service_role only + role gate
- wallets grant accidentally revoked for authenticated → restored owner SELECT/INSERT (RLS)

## Residual
- Advisor ERROR: many shared.* tables previously RLS-disabled (now enabled for money set)
- `profiles_public` SECURITY DEFINER view (intentional for directory)
- Stripe promo binding / referral farm still open product risks
- A6 full hire insert probe needs fee_version column (null constraint) — guard still blocked paid status via A5

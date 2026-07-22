# Red-team prompt pack (Aplus1 / ecosystem)

ใช้สั่ง subagent ทีละด้านบน **staging/preview + DB สำเนา** เท่านั้น  
ห้ามยิง production / Omise-Stripe live / exfiltrate ข้อมูลจริง  
หาช่องโหว่ด้วยการอ่านโค้ด + ทดสอบป้องกัน — ไม่เขียน exploit payload สำหรับโจมตีจริง

## Rules of engagement (ทุกชุด)

```text
AUTHORIZED static + defensive testing only.
- Environment: staging/preview + copy DB only
- No production, no live payment keys, no DoS, no data exfiltration
- Deliver: severity, path, root cause, fix, verify steps
- Stop and escalate on Critical (service_role leak, cross-user wallet, forge paid)
```

---

## A — Money theft / fraud

```text
OBJECTIVE A — Money theft / fraud (Anthem Omise + Solo Stripe + wallet/PX/cashout)
Hunt: client-writable paid hire_orders; /api/hire-charge auth + amount trust;
Omise webhook HMAC fail-open; mock RPCs; Stripe promo vs credit binding;
double-spend/race; welcome px in cashout; webhook replay.
Return Critical→Low with file:line + fix. No exploit payloads.
```

## B — Data theft / RLS / IDOR

```text
OBJECTIVE B — RLS / IDOR / PII
Hunt: profiles email/bank cross-user SELECT; wallets/cashout bank_info;
messages; gift_transactions; SECURITY DEFINER helpers (available_*_px);
force_purge_user spoofable admin arg; private storage path access.
Return findings + confirm live grants if possible via advisors (read-only).
```

## C — Account takeover / privilege escalation

```text
OBJECTIVE C — ATO / priv-esc
Hunt: open redirect; OAuth email gate abuse; auto_grant_admin by email;
user_roles non-admin write; AdminGuard client-only vs RPC has_role;
reset-password any-session; reauth flag after logout; admin_* without role.
```

## D — XSS / Edge / secrets / CSP

```text
OBJECTIVE D — Web takeover surface
Hunt: javascript: href in hire delivery/chat; dangerouslySetInnerHTML;
Edge CORS *; missing JWT/zod; error leaks; service_role in bundle;
VITE_DEMO_MODE on prod; LINE redirect_uri allowlist; CSP drift.
```

## E — Referral / abuse / business logic

```text
OBJECTIVE E — Referral / abuse / logic
Hunt: welcome→earned gift laundering; referral multi-account farm;
claim_welcome_mission without checks; hire/collab/hire_orders status spoof;
report/feedback INSERT bypass rate-limit RPC; chat/upload rate limits;
report IDOR.
```

---

## Orchestrator prompt (รันทั้งชุด)

```text
You are Adversary-0 coordinator. Run objectives A→E sequentially or in parallel
as separate audits against AunAun-fresh. Merge into one report:
Executive summary, Top 5 Critical, P0/P1/P2 remediation plan, residual risks.
Do not attack live production. Prefer code+SQL evidence over speculation.
```

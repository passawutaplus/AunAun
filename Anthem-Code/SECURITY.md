# Security Policy

We take the security of Anthem seriously. Thank you for helping keep our users safe.

## Reporting a vulnerability

Please **do not** open public GitHub issues for security reports.

Email: `security@pixel100.com`.
PGP: optional — request a key in your first message.

We aim to respond within **3 business days** and to issue a fix or mitigation within **30 days** for high/critical reports.

## Scope

In-scope:
- The Anthem web application (preview + production URLs in `docs/pentest-scope.md`)
- Edge functions under `supabase/functions/`
- Database access via the Supabase Data API + RPC

Out-of-scope:
- Lovable platform infrastructure
- Third-party services we depend on (Supabase, Google OAuth)
- Denial-of-service or volumetric attacks
- Reports based purely on automated scanner output without proof of impact
- Social engineering of Anthem staff

## Safe harbor

Good-faith research consistent with this policy will not result in legal action. Please:
- Do not access, modify, or delete user data
- Do not run scans that degrade availability
- Stop and report immediately if you encounter PII
- Give us reasonable time to remediate before public disclosure (90 days)

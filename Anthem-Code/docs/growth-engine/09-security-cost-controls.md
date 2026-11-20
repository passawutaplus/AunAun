# 09 · Security & Cost Controls

## Access

- `/admin/growth` sits behind `AdminLayout` → `AdminGuard`. `/dev/growth` (same screens, mock data, no login) exists only in `npm run dev` builds.
- Schema `growth`: RLS on every table, admin-only `SELECT`, owner writes only decision columns (column-level grants). `anon` has no schema access. Agents/publisher run as `service_role` from Edge Functions; `service_role` is never shipped to the browser (CI greps `dist/`).
- Approvals require a signed-in admin (`OWNER_ONLY` trigger); agents cannot approve.
- Append-only tables for versions, approvals, playbooks, costs and audit. Audit rows for status changes, approvals, locks, Pause All, mode changes, cap changes, job revocations.

## Secrets and public repo

- The repo is public. **Never commit** prompts, editorial strategy, budgets/caps, account handles, tokens or keys. They are DB rows (`ge_playbooks`, `ge_settings`) or Supabase secrets.
- `ge_provider_connections.token_secret_ref` holds the *name* of a secret, never its value.
- The Claude API key (Phase 2) is a Supabase Edge secret only; never `VITE_*`.
- A vitest check fails if the migration contains key-like strings or a hard-coded cap.

## Untrusted content

Sources, social comments and web pages are data. Agents never execute instructions found in them. Social comments are stored redacted and expire after 90 days. Privacy, legal and crisis comments always go to the owner; no automated public replies.

## Kill switch

`ge_settings.pause_all` (dashboard switch "Pause All"): no publish dispatch, no publish claims, no agent claims. Existing jobs stay; nothing is deleted. Turning it on/off is audited and (Phase 1b) sent to LINE.

## AI credit rule (owner decision D2)

The run-time agents use only the monthly API credit included with the owner's plan.

| Step | Mechanism |
|---|---|
| Track | After each call, `ge_record_ai_usage(run, campaign, estimated_usd)` adds the estimate (tokens × published price) to `ai_spent_estimate_usd` |
| Cap | Owner sets `ai_monthly_cap_usd` in the dashboard (DB only). Reaching it flips `ai_credit_status = EXHAUSTED` |
| Hard stop | An API "credit balance too low" error → `ge_mark_credit_exhausted()` |
| Effect | Queued and newly created AI tasks → `BLOCKED_BUDGET`; non-AI tasks continue |
| Notify | `ai_budget_notice_pending` is raised once per cycle → one LINE notice |
| Resume | `ge_start_credit_cycle(date)` on the next credit date → tasks back to `QUEUED` |
| Never | auto-reload, buying credits, turning on paid usage, silently lowering quality |

Thresholds 70 / 90 / 100% (`budgetAlertLevel`). The dashboard cost meter shows `UNAVAILABLE` until a real source exists (no key yet), and labels every simulated number as `MOCK`.

Magnific: quality-first, but per-campaign soft limit and monthly hard limit; at the hard limit generation stops until the owner approves more (audited). Credits are read from the provider, never assumed.

## Spend outside AI

The marketing outreach budget (people, partnerships, events) is separate from platform/AI costs and is never used for AI automatically.

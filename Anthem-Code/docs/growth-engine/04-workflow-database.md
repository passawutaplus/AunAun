# 04 · Workflow & Database Design

## Campaign state machine

Main path (no skipping):

`SIGNAL_FOUND → VERIFIED → PROPOSED → BRIEF_APPROVED → DRAFTING → VISUAL_READY → ADAPTED → QC_PASSED → AWAITING_APPROVAL → APPROVED → SCHEDULED → PUBLISHING → PUBLISHED → MONITORING → LEARNED`

Side states: `NEEDS_VERIFY`, `CHANGES_REQUESTED`, `REGENERATING`, `REJECTED`, `PAUSED`, `PUBLISH_FAILED`, `EXPORTED_FOR_MANUAL_POST`, `ARCHIVED`.

Revision loop: `AWAITING_APPROVAL | APPROVED | SCHEDULED → CHANGES_REQUESTED → REGENERATING → QC_PASSED (or NEEDS_VERIFY) → AWAITING_APPROVAL`.

The full table is `TRANSITIONS` in `src/lib/growth/engine.ts` and `growth.ge_status_transitions` in SQL. A vitest test keeps them identical. `APPROVED` additionally requires every platform of the latest version to be approved.

`BRIEF_APPROVED` for low-risk topics inside approved pillars may be set by editorial policy (not the owner); risky or off-pillar topics and anything using other people's work need an owner decision at brief stage. Final approval is always the owner's.

## Schema `growth` (draft migration `20261120100000_growth_engine_schema.sql`)

| Group | Tables |
|---|---|
| Settings & audit | `ge_settings` (one row: mode, pause_all, AI credit status/cycle/cap/estimate, `notify_mode` mock/line, `notify_batch_seconds`, `notify_max_batches_per_day`), `ge_audit_logs` (append-only) |
| Notifications | `ge_notifications` (one short Thai line + `/admin/growth` path, unique `dedupe_key`), `ge_notification_batches` (one LINE message per burst; `MOCK` / `READY` / `SENT` / `FAILED`) |
| Playbooks | `ge_playbooks` (prompts, editorial strategy, brand rules, CTA library; versioned, append-only) |
| Research | `ge_sources`, `ge_signals` |
| Campaigns | `ge_status_transitions`, `ge_campaigns`, `ge_campaign_versions`, `ge_briefs`, `ge_assets`, `ge_asset_versions`, `ge_platform_variants`, `ge_locks` |
| Approval | `ge_approval_requests`, `ge_approvals` (append-only), `ge_comments`, `ge_revision_requests`, `ge_owner_decisions` |
| Publishing | `ge_publish_jobs`, `ge_post_publications` |
| Feedback | `ge_metric_snapshots`, `ge_social_comments` (redacted, 90-day expiry), `ge_funnel_events`, `ge_learning_memos` |
| Brand | `ge_brand_templates` (R01–R06, append-only) |
| Integrations | `ge_provider_connections` (stores the *name* of a secret, never a token) |
| Agents | `ge_agent_tasks`, `ge_agent_runs`, `ge_usage_costs` (append-only) |

### Versioning and hashes

- `ge_campaign_versions`, `ge_briefs`, `ge_asset_versions`, `ge_platform_variants`, `ge_playbooks`, `ge_brand_templates`, `ge_approvals`, `ge_usage_costs`, `ge_audit_logs` reject UPDATE/DELETE (`APPEND_ONLY`).
- `content_hash` = `sha256` over the row's canonical jsonb, computed by a trigger (client values are ignored).
- Versions are numbered `1, 2, 3…` per campaign without gaps (row lock on the campaign).
- A platform variant's hash covers its payload (caption, CTA, canvas, asset version hashes) **and** its schedule slot, so moving a slot also needs re-approval.

### Approval validity

A platform is approved when the latest decision in `ge_approvals` for *(campaign, platform, hash)* is `APPROVED` **and** that hash equals the platform's hash in the latest version. If a revision leaves a platform unchanged, its hash is unchanged and the approval carries over; any change produces a new hash and the old approval no longer matches.

When a new variant is inserted with a different hash, scheduled jobs for that platform become `REVOKED` (trigger).

### Publish jobs

- `idempotency_key = campaign_id:platform:vN:YYYY-MM-DDTHH:MMZ` (UTC), unique.
- Partial unique index: one live job per *(campaign, platform, scheduled_at)* whatever the version.
- Guard trigger: scheduling needs a valid approval; dispatch (`PUBLISHING` / `EXPORTED_FOR_MANUAL_POST`) also needs `pause_all = false`, a publishable campaign status and a due slot. `REVOKED/CANCELLED/PUBLISHED` jobs never move again. `PUBLISH_STATUS_UNKNOWN` can only go to `PUBLISHED` or `PUBLISH_FAILED` (reconcile before retry).
- `ge_post_publications.idempotency_key` is unique: the same job can never produce two posts/exports. `simulated = true` while in mock mode.

### Agent functions (service_role only)

`ge_claim_next_task`, `ge_complete_task`, `ge_record_ai_usage`, `ge_mark_credit_exhausted`, `ge_start_credit_cycle`, `ge_claim_due_publish_job`, `ge_flush_notifications`. Triggers call `ge_notify()` for every event (see doc 08).

### RLS

Every table: RLS on, `SELECT` for admins only (`public.has_role(auth.uid(), 'admin')`). The owner can write only decision columns (settings switches, approvals, comments, locks, revision requests, campaign status, owner decisions, memo decisions, playbooks). Agents and the publisher use `service_role`. `anon` has no access to the schema.

### Applying (owner)

1. Review the SQL. 2. Run it in the SQL editor. 3. Settings → API → Exposed schemas: add `growth`. 4. Re-run `Solo-Code/supabase/tests/growth-engine/run.sh` locally if the SQL changed. Nothing else in the app depends on it yet.

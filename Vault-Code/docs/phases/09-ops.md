# Phase 09 — Self-healing & ops

- **Link health (weekly)**: lightweight check of image_url for published items; increment check_fail_count; after N consecutive failures → `hidden`; recovery resets.
- **Retry & dead-letter**: failed jobs retry with backoff; after N attempts → dead-letter table, never retried forever.
- **Kill switch**: one flag stops seeding, AI calls, emails. Document how to flip it.
- **Caps**: daily item cap, monthly AI cap; hitting one stops the job and is reported.
- **Daily report** to owner email (env): fetched/published/review/rejected/hidden counts, failures, estimated AI cost, caps reached, failing sources, top unknown search terms. Urgent alert only for real problems (cap reached, source down for days, kill switch flipped).
- **Review queue**: minimal protected admin page: `review` items with approve/reject; top `unknown_terms` with one-click "add as synonym of…".
- **Taxonomy growth**: the promoted-keyword/unknown-term review queue (05.D) is the same queue phase 10 grows after launch; golden-set precision report after any tagger change; the daily report includes AI quota usage.
- **Takedown**: "Report this image" creates a report; item is hidden IMMEDIATELY and appears in the admin queue (delete permanently / restore). Applies to feed images and public uploads.
- **Retention jobs:** purge trash after 30 days; purge expired signed links; prune `search_events`/`item_signals` by the retention schedule in `docs/legal/ROPA.md` (phase 12).
- **Privacy ops:** account export/delete jobs, `dsar_requests` due dates in the daily report, incident section in RUNBOOK (phase 12).
- **Admin:** the seeder admin `/admin/seeder` already exists; add the review queue and takedown queue there or behind the same super-admin guard, not a new auth system.
- **Audit log**: each publish/hide/reject records job/model and reason.
- Link the DRAFT pages /terms, /privacy, /copyright-takedown (phase 02) from the report form and footer; owner/legal finalizes them.
- Write `docs/RUNBOOK.md` (≤40 lines): start/stop, read report, handle takedown, rotate keys, grow taxonomy.

Done when: owner can read one daily report, flip kill switch, report an image and see it vanish, and a broken link gets hidden automatically.

# 12 · Roadmap & Progress

Owner's order: **build the system → develop → test → approve → video last.**

## Phase 0 — Audit & decisions ✅ (2026-11-20)

Decisions D1–D4 and the credit rule recorded (doc 01). Audit of the admin area, edge functions, events and keys done.

## Phase 1 — Foundation in mock mode ✅ built, ⏳ migration review

Done in this PR:

- [x] 12 Phase 0 docs (this folder)
- [x] Draft `growth` migration: state machine, append-only versions with sha256, hash-bound approvals, publish guards, agent queue with lease/deps/idempotency, settings (mode, Pause All, credit), audit, RLS — tested on local Postgres (36/36)
- [x] Pure engine + vitest (state machine, invalidation, per-platform approval, Pause All, idempotency, BLOCKED_BUDGET, locks)
- [x] `/admin/growth` dashboard on mock data: Approve Today / Needs Decision / Growth Insights; campaign review with master + IG/FB/Threads/Pinterest/Blog, 3×3 feed, scoped comments, locks, Revise → v+1 with Before/After, approve all/selected, reject, schedule + simulated dispatch, Pause All, cost meter (`UNAVAILABLE` vs `MOCK`)

Gate (spec): demo shows comments on an image frame, a targeted revision and a new version that needs re-approval → **met in mock mode**.

Remaining Phase 1 items:

- [ ] Owner reviews and applies the migration; expose `growth` in API settings
- [ ] Phase 1b: swap the in-memory store for Supabase reads/writes; seed the demo campaign as rows; real audit view
- [x] Notification design: every event → `ge_notifications`, grouped per burst, links to `/admin/growth`, mock sender + dashboard preview (D4 updated 2026-11-20)
- [ ] LINE real sends (needs the owner's OK): add kind `growth` to `admin_line_outbox`, a `flexGrowthBatch` formatter in `_shared/line-admin-format.ts`, cron calling `ge_flush_notifications()` every minute, `line-admin-notify` marks batches `SENT`/`FAILED`; check the LINE OA message quota first
- [x] North-star from existing data (no cookie, no new events): Activated creators (7d) = signup → core profile (photo + role/skills + bio ≥ 20) → first Published project within 7 days. `src/lib/growth/activation.ts`, query in `src/server/queries/growthActivation.ts`, shown in Growth Insights; `UNAVAILABLE` on error
- [ ] Attribution: UTM capture on landing + campaign id at signup (needed to say which campaign activated whom); add `published_at` to projects for an exact publish time
- [ ] Inline anchors: image hotspot rectangles (normalised [0,1]), text ranges

## Phase 2 — Real AI editorial & visuals (needs owner inputs)

Inputs: Claude API key as a Supabase secret (owner creates it; credit-capped), monthly cap in `ge_settings`, prompts + editorial strategy approved into `ge_playbooks`, Magnific REST API availability on the current plan.

- Research adapters with real provenance; Claude strategy/copy/SEO with JSON schemas and citations
- Visual brief → Magnific adapter → stored asset versions → deterministic renderer → QC
- Mode `test`: real generation, export only
- Gate: one complete approved campaign with native IG/FB/Pinterest/Blog previews, no real publishing

## Phase 3 — Publishing & tracking

- Manual export bundle (download) + "paste live URL" flow; blog publishing with sitemap/canonical/OG
- Then Meta adapter (FB Page + IG Professional) with sandbox tests, token status, reconcile
- Gate: one supervised approved post per supported platform with real remote IDs and URLs

## Phase 4 — Feedback loop, then video

- Metrics/comments where permitted (`UNAVAILABLE` otherwise), campaign → activated creator funnel, weekly memo with ≤3 decisions
- Design Stories EP.01 via HyperFrames (doc 11), voiceover approach decided first

## Owner decisions needed next

1. Review/apply the draft migration (or ask for changes).
2. Phase 2 inputs: create the Claude API key (Supabase secret), confirm the monthly cap to store in the DB, real social account handles, whether Magnific REST API is included in the current plan.

# 10 · Testing Plan

## Layers

| Layer | Where | Runs |
|---|---|---|
| Pure engine (TS) | `src/lib/growth/__tests__/engine.test.ts` | CI (`npm run test`) |
| Migration ↔ engine parity | `src/lib/growth/__tests__/migrationParity.test.ts` | CI |
| SQL behaviour | `Solo-Code/supabase/tests/growth-engine/run.sh` on a throwaway Postgres 17 | local, before applying / after editing the migration |
| UI walkthrough | `/dev/growth` in `npm run dev` (screenshots in the PR) | manual / Playwright later |
| Live integrations | per adapter, sandbox account first | Phase 2–3 |

## Covered now

Engine (vitest):

- State machine: main path step by step; refuses skips; terminal `ARCHIVED`; `PAUSED` remembers where it came from.
- Approval: owner only; per-platform; campaign `APPROVED` only when all platforms are; re-approval binds the new hash.
- Invalidation: revising frame 2 invalidates Instagram only; Facebook keeps its v1 approval (same hash); scheduled IG job revoked; publisher refuses it.
- Revision: demo comment parsed (target frame 2, −30%, protect frame 3); v2 created, ~30% cut, returns to `AWAITING_APPROVAL`; v1 unchanged; locked components identical; comment pointing only at locked parts → no version, `NEEDS_OWNER_DECISION`; unknown instruction → owner; derived pin logic; feed rebalance clears the dark-run warning.
- Pause All: blocks dispatch (jobs kept) and agent claims.
- Idempotency: key format in UTC; scheduling twice → one job; duplicate job row → `DUPLICATE`, one publication; unknown status → `NEEDS_RECONCILE`; not before slot; mock export is `simulated`, never "published"; task enqueue dedupe.
- Agent queue: dependencies, lease, expired-lease reclaim, only the holder completes.
- Budget: exhausted → AI tasks `BLOCKED_BUDGET`, non-AI continue, one notice per cycle; cap reached = exhausted; new cycle resumes.

SQL (36 checks, last run 2026-11-20, all ok): sha256 hashes set by DB, version gaps rejected, append-only, `OWNER_ONLY`, `HASH_MISMATCH`, `NOT_APPROVED` scheduling, invalid transition, `NOT_ALL_PLATFORMS_APPROVED`, non-admin sees nothing, anon denied, idempotency + one live slot, `PAUSED_ALL`, no claims while paused, new variant revokes only changed platform, closed jobs never move, reconcile before retry, lease + deps + holder-only completion, cap → `EXHAUSTED` + one notice, new AI tasks start blocked, next cycle requeues, audit rows.

## Acceptance checklist (spec §20) — Phase 1 status

| Item | Status |
|---|---|
| Approve / Request changes / Reject / Pause on one page | ✅ mock |
| Natural-language comments incl. "don't touch slide 3" | ✅ mock parser (limited vocabulary) |
| Targeted edits, locked parts preserved, Before/After | ✅ |
| 3×3 feed preview in publish order with real cover | ✅ mock tiles |
| Versions, resolved comments, approval log, credits per campaign | ✅ versions/comments/audit · credits `UNAVAILABLE` |
| Unapproved / out-of-date content cannot publish | ✅ TS + SQL |
| Metrics shown or explicitly `UNAVAILABLE` | ✅ |
| Kill switch stops costs and integrations | ✅ Pause All (no integrations yet) |
| Weekly report with ≤3 decisions | ⏳ mock insights only |
| Trend sources with link/date/score, article SEO fields, rights per image, consent per spotlight | ⏳ schema ready, Phase 2 |
| Real remote post IDs/URLs, 24h/72h/7d loop, attribution | ⏳ Phase 3–4 |

## Not tested yet

Real Supabase (PostgREST exposure, real `has_role`, Edge Functions), real AI output quality, Magnific, renderer output files, LINE delivery, mobile layout of the dashboard, accessibility audit, load.

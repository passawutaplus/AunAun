# SAMECOR Growth Engine — docs

An AI marketing department where the owner only **decides, comments and approves**. AI researches, writes, designs, adapts per platform, checks, queues, and learns from results. Nothing is published without an approval that is tied to the exact content version.

**Status (2026-11-20): Phase 0 done, Phase 1 built in mock mode.** No AI calls, no live publishing, no credits used. The `growth` schema is a draft migration that has **not** been applied.

| # | Doc | What it covers |
|---|---|---|
| 01 | [Requirements & Decisions](01-requirements-decisions.md) | Goals, non-negotiables, owner decisions D1–D4 |
| 02 | [System Architecture](02-system-architecture.md) | Components, data flow, mock vs live |
| 03 | [AI Agent Roles & Task Ownership](03-agent-roles.md) | Dev-time vs run-time split, who owns what |
| 04 | [Workflow & Database Design](04-workflow-database.md) | State machine, `growth` schema, queue/lease |
| 05 | [SEO & Content Strategy](05-seo-content-strategy.md) | Summary of the editorial pipeline and gates |
| 06 | [Feed Design & Visual System](06-feed-visual-system.md) | Brand tokens, recipes, 3×3 feed QC |
| 07 | [Platform Publishing Rules](07-platform-publishing-rules.md) | Per-platform format, manual export, idempotency |
| 08 | [Approval, Comment-to-Revision & Notifications](08-approval-comment-revision.md) | Hash-bound approvals, scopes, locks, diff, LINE notifications |
| 09 | [Security & Cost Controls](09-security-cost-controls.md) | RLS, secrets, Pause All, credit rule |
| 10 | [Testing Plan](10-testing-plan.md) | Unit, SQL, UI, acceptance checks |
| 11 | [Video Production Pipeline](11-video-pipeline.md) | Phase 4, HyperFrames limits |
| 12 | [Roadmap & Progress](12-roadmap-progress.md) | Phases, gates, what is done, what is next |

Code:

- Pure logic: `src/lib/growth/` (`engine.ts`, `revision.ts`, `tasks.ts`, `notify.ts`, `hash.ts`), tests in `src/lib/growth/__tests__/`
- Mock data: `src/lib/growth/mockData.ts`
- Dashboard: `src/pages/admin/growth/` → `/admin/growth` (admin only); `/dev/growth` shows the same screens without login in `npm run dev`
- Draft migration: `Solo-Code/supabase/migrations/20261120100000_growth_engine_schema.sql`
- SQL behaviour test: `Solo-Code/supabase/tests/growth-engine/`

The full spec (owner's handoff, Thai) stays private. These docs keep only what engineering needs; prompts, editorial strategy, budgets and account handles live in the database or in secrets, never in this public repo.

# 01 · Requirements & Decisions

## Goal

North-star: **Activated Creators** = new creators who sign up → complete a profile → publish a first real project within 7 days. Reach and likes are secondary signals.

The owner's job is limited to: **Approve / Request changes (comment) / Reject / Pause / Decide**. Everything else is done by agents.

## Non-negotiables

1. Never publish unapproved or changed content. Approval is per version and per platform, bound to a content hash. Silence is not approval.
2. Comments can target a campaign, an image frame, a platform's copy, an SEO section, or the 3×3 feed. A revision creates a new immutable version, shows Before/After, and never touches locked parts.
3. One campaign review screen: research, content, images, SEO, per-platform previews, feed 3×3, QC, cost, schedule.
4. Thai text and logos are rendered by a deterministic renderer (HTML/SVG), never baked into AI images.
5. Platform-native creative: one master idea, different cuts per platform (not one image stretched everywhere).
6. Human-first SEO: original, sourced, no link spam, no mass AI articles.
7. Respect API permissions. Without an API, export a human-ready draft; never fake posting or metrics.
8. Measure activation, not just impressions. Unavailable data is shown as `UNAVAILABLE`, never guessed.
9. Protect credentials, personal data, creator rights. RLS, server-side secrets, audit log, kill switch.
10. Start in **mock mode**. Enable one real channel at a time after it passes tests.

## Owner decisions (Phase 0, 2026-11-20)

| ID | Decision |
|---|---|
| Order | Build the system → develop → test → approve → video last (Design Stories EP.01 is Phase 4). |
| D1 Where | Inside this repo at `/admin/growth`, same Supabase project. The repo is public, so prompts, strategy and budgets live in the DB. |
| D2 AI | Run-time agents use the monthly API credit included with the owner's plan, as a **hard cap**. When it runs out: stop (`BLOCKED_BUDGET`), send one LINE notice, resume next cycle. Never auto-reload, never buy credits, never enable paid usage add-ons. Same rule for Claude Code plan limits: wait for the reset. The API key does not exist yet (Phase 2). |
| D3 Publishing | Manual export through Phase 1–3 (no social APIs). First adapter later: Meta (FB Page + IG Professional). |
| D4 Notifications | Existing LINE admin group: 08:30 digest, Sunday brief, urgent alerts only. |
| Engineering calls | Brand Book v1.0 tokens (not the spec's draft colours) · Supabase Cron is the only scheduler · deterministic Thai renderer · everything starts in mock mode. |

## Audit facts that shape the build (2026-11-20)

- `/admin` already has an older Marketing module (`shared.kuy_*`, empty). Growth Engine is separate; the old module is untouched.
- `marketing-ai` and `trend-report` edge functions use another LLM provider; Growth Engine does not reuse them.
- `articles` table is empty; `/journal` route exists → blog publishing must be built (Phase 3).
- `product_events` has no signup / profile-complete / first-project events and no UTM capture → the activation funnel must be built before Growth Insights can show real numbers.
- No Anthropic key and no social API keys in Vercel.

## Out of scope for Phase 1

Real AI calls, image generation, social APIs, blog publishing, analytics ingestion, LINE sending, video.

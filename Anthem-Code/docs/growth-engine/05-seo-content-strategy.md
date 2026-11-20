# 05 · SEO & Content Strategy (summary)

The detailed editorial strategy (pillar mix, keyword clusters, CTA library, publishing windows) is owner-approved data in `growth.ge_playbooks` (`kind = 'editorial_strategy' | 'cta_library'`). This page only describes the mechanics the system enforces.

## Voice

Creative peer / editor / curator, not a sales page or trend bot. Clear, artful, human, practical. Thai body copy short and friendly; English headings are fine. No superlatives or unproven claims ("No. 1", "best platform", user counts, unreleased features, official partnerships). CTA after value, never "สมัครเลย!!!" on every post. UI copy rules (no "AI" labels, casual Thai) follow the app's existing copy guide.

## Pillars

Five pillars (design knowledge, creator showcase, opportunities, community dialogue, platform/behind-the-scenes). Their monthly share is a **guideline**, never a quota; the weekly planner may post less when sources or visuals are weak.

## Article pipeline (1 per week to start)

`keyword research → search intent → content gap → sources → original angle → outline → draft → human-value check → visual brief → visuals/diagrams → on-page SEO → fact/copyright QC → owner approval → publish → index check → analytics review → refresh`

Every article brief records: language, audience, primary/secondary keywords, intent, pillar, unique value, compared SERP URLs (real, never invented), sources with `last_verified`, slug, outline, FAQ candidates (only real questions), CTA goal, **verified** CTA destination, internal links, hero recipe, fact risk.

## Formatting defaults

- Answer in the first 1–3 paragraphs; one H1; H2 = steps or real questions.
- Why it matters → steps → before/after → checklist → pitfalls → CTA.
- 800–1,500 words for how-tos, 400–900 for quick editorials (guidance, not a ranking rule).
- Title, meta description, canonical, OG title/description/image, byline, published/updated dates, meaningful alt text, internal links.
- Structured data only when it matches visible content (`Article`, `BreadcrumbList`, `Event` where it applies).
- Thai + English only when both are good; no machine-translated duplicates.

## Publish gate (blocks publishing)

- Original, not a near-duplicate of our own pages; no clickbait; every claim sourced.
- Canonical points at the real URL; no accidental `noindex`; in sitemap; OG preview renders.
- Tracking link and funnel CTA tested; image rights recorded; alt text descriptive.
- Published revision = the owner-approved hash.

## Authority

Backlinks come from genuine value: interviews, resource lists, event pages, guest editorials. Agents find prospects and draft emails; **the owner approves every outreach**. No mass links, no comment spam, no ranking promises. Success = referral sessions and activated creators, not link counts.

## Mock QC in Phase 1

`runQc` checks SEO title length (30–60) and meta description (70–160). The real QC (Phase 2) adds source freshness, link checks, duplicate detection and schema validation.

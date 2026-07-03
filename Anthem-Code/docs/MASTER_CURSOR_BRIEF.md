# Aplus1 Research + Product Handoff For Cursor

Updated: 2026-07-03  
Purpose: Give Cursor one compact package to understand Aplus1's research, positioning, UX direction, and implementation priorities.

## Start Here

Read in this order:

1. `Anthem-Code/docs/product/README.md`
2. `Anthem-Code/docs/product/aplus1-prd.md`
3. `Anthem-Code/docs/product/aplus1-ux-flow.md`
4. `Anthem-Code/docs/product/aplus1-feature-spec-cursor.md`
5. `Anthem-Code/docs/research/aplus1-opportunity-research.md`
6. `Anthem-Code/docs/research/gemini-research/Aplus1_ UX Flow และกลยุทธ์ตลาด.txt`
7. `Anthem-Code/docs/research/gemini-research/aplus1_research_report.html`

Use the remaining research files in `Anthem-Code/docs/research/` as references when making product or copy decisions.

## Product Thesis

Aplus1 should not be treated as another freelance marketplace or job board.

The core thesis is:

> ผลงานจริง -> โอกาส

The product should help creators publish real work with enough context, help hirers/opportunity givers understand capability from that work, then turn interest into a project-qualified conversation.

## Key Strategic Direction

Use "โอกาส" as the top-level product concept. Use "งาน" only when the context is specifically paid work, job posts, employment, or freelance execution.

Primary positioning:

> ผลงานจริง พาไปเจอโอกาสใหม่

Primary MVP loop:

> Creator publishes a real project with useful context -> hirer discovers it -> opportunity conversation starts from that project

North Star:

> Project-qualified opportunity conversations per week

## Implementation Priority

Build or fix these first:

1. Opportunity status
2. Project context template
3. Project-specific inquiry/contact
4. Save/collection consistency
5. Chat context and privacy
6. Jobs/opportunity submit feedback
7. Infinite-loading fallbacks on critical routes

Do not prioritize these before the loop works:

- Full payment escrow
- Full marketplace package pricing
- Broad generic job board behavior
- Public popularity ranking
- Heavy contest/challenge system
- Advanced AI ranking

## Important Note About Gemini Files

The Gemini files are included as strategy/research input:

- `Anthem-Code/docs/research/gemini-research/Aplus1_ UX Flow และกลยุทธ์ตลาด.txt`
- `Anthem-Code/docs/research/gemini-research/aplus1_research_report.html`

Use them to enrich market framing, UX ideas, and strategy. Before turning any market number, commission claim, or competitive claim into product copy or investor-facing material, verify the source. The source-backed Codex research files in `Anthem-Code/docs/research` should be treated as the more conservative baseline.

## Cursor Working Rules

When implementing:

- Preserve existing production data and routes.
- Verify current Supabase schema before writing migrations.
- Do not add service-role secrets to frontend code.
- Keep Thai-first copy in core user actions.
- Avoid making discovery feel package-first or price-first.
- Add loading, empty, success, error, and permission states.
- Add focused tests for critical flows only.
- Run build and relevant tests after changes.
- Include desktop/mobile screenshots when UI changes.

## Files In This Package

### Product Specs

- `Anthem-Code/docs/product/README.md`
- `Anthem-Code/docs/product/aplus1-prd.md`
- `Anthem-Code/docs/product/aplus1-ux-flow.md`
- `Anthem-Code/docs/product/aplus1-feature-spec-cursor.md`

### Codex Research

- `Anthem-Code/docs/research/aplus1-opportunity-research.md`
- `Anthem-Code/docs/research/aplus1-competitor-teardown.md`
- `Anthem-Code/docs/research/aplus1-user-interview-guide.md`
- `Anthem-Code/docs/research/aplus1-mvp-strategy.md`
- `Anthem-Code/docs/research/aplus1-copy-system.md`

### Gemini Research

- `Anthem-Code/docs/research/gemini-research/`

### Previous Context

- `Anthem-Code/docs/reference/cursor-email-handoff-aplus1.md`

This previous handoff is included only as background context. The current product direction should follow `Anthem-Code/docs/product` first.


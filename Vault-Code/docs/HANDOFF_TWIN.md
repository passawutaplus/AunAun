# Handoff: build Creative Twin inside A+ Vault (Option A)

Written 2026-10-27 for Claude Code on the owner's computer. Read this first, then `docs/creative-twin-vision.md` (the product vision, owner's own words) and `CLAUDE.md` (project rules).

## Decision
Build Creative Twin as a **module inside the existing Vault-Code app** (vanilla JS + Vercel serverless + Supabase). NOT a Next.js rewrite, NOT a separate app. Reuse login, database, AI budget guard and kill switch already in `lib/engine/`.

## Current state (verified 2026-10-27)
- Repo `passawutaplus/AunAun`, folder `Vault-Code/`. Branch `feat/mvp-free-launch` at `c954420` already contains **Design Feed** (replaces the Museum): renamed UI, hotlinked https previews with credit + source link, new categories (logo, graphic, ui, product, furniture, architecture, fashion, other), rewritten Copyright section in `outputs/a-plus-vault/legal.html`, bot `tools/design_feed.py`. `npm run check` and `npm test` pass (275/275).
- Supabase project ref `zkflkpbmbozrchqncpzi`. **The Museum wipe has NOT been run.** `tools/design_feed_replaces_museum.sql` deletes all 856 `discover_items` rows (+25 `item_signals`), replaces the `discover_items_published_ok` check (now: credit + https source + https image + hotlink), allows `source='feed'`, drops the unused empty table `design_feed_items`, pauses the old seeder. It is destructive: owner approved, but the owner must run it (SQL editor) or approve the tool prompt. Until it runs, the app code and the DB disagree.
- Vercel project `aplus-vault`: every Git build since early Oct failed (builds ran at repo root). Root Directory was set to `Vault-Code` on 2026-10-26; **result not yet verified**. Last READY production deploy is from early Oct. Production branch is `main`; nothing of Design Feed is on `main` yet.
- `tools/design_feed.py`: stdlib Python RSS bot (Dezeen, Designboom, Yanko, Brand New, Creative Boom, Its Nice That, Core77, Fubiz). Writes `discover_items` with `status='review'` (hidden until set to `published`). Needs env `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (never commit or paste). **Not yet run against the real feeds**; the extra feed URLs were written from memory and untested.
- Owner said there are no real users yet (DB has test accounts).

## Gap vs the vision (found by keyword/file scan, not by running the app)
| Vision | Status |
|---|---|
| Vault (capture, auto color/tags, search, smart collections) | mostly done |
| Capture | image, link, note, file done; **voice missing** |
| Home dashboard | done (For You) |
| Projects | partial: workspace + moodboards; **no brief/feedback/decision timeline** |
| AI suggestions | partial ("Needs you"); no Silent/Normal/Proactive |
| Creative Twin profile, memory levels, AI chat, agent, hardware | **not present** |

## Build order (one branch per step, off `feat/mvp-free-launch`)
0. Prep: run the Museum SQL, confirm the Vercel build, update `docs/plan-v7-status.md` (its Museum phases 2-6 are obsolete), run the bot once with real feeds and fix any dead feed URL.
1. **Taste signals:** log keep / skip / open for Design Feed and Vault items into a new table (user_id, item ref, action, time, source). Start collecting data now.
2. **Twin memory:** table of learned facts with level (global / client / project), evidence (item ids), confidence, user-editable + deletable. Show evidence, not a made-up percentage.
3. **Twin profile page:** sections from the vision (style, thinking, decisions, workflow, preferences, learned patterns); every claim links to its evidence; correct/delete controls.
4. **Project context:** brief, client feedback, decisions, timeline on the existing project workspace.
5. **AI chat:** context = session > project > client > global Twin + Vault, behind a provider abstraction in `lib/` (no provider lock-in), using the existing budget guard.
6. Later: voice capture, agent actions with approval, integrations, hardware.

## Rules (from CLAUDE.md and the vision)
- Every new table: RLS on, user sees only own rows; client data never crosses projects; no NDA material used for any training.
- AI keys server-side only. Never read/print/commit `.env*`.
- Do not run SQL, deploy or push unless the owner says so.
- After any change: `npm run check`; before PR: `npm run test:gate`.
- Edit with small unique replacements; never open all of `app.js` / `styles.css` (very long lines). New CSS goes in a new commented block at the end.
- Style: minimal, spacious, calm; the user's work is the visual focus; AI is an invisible layer.

## Open decisions for the owner
- Run the Museum SQL now, or after merging to `main`?
- Open a PR `feat/mvp-free-launch` -> `main` once the Vercel build is green?
- Default AI activity level (suggest Normal) and monthly AI budget cap.
- Lawyer review of the new Copyright wording before public launch (bracketed `[counsel]` placeholders remain in `legal.html`).

## Start prompt for Claude Code
> Read `Vault-Code/docs/HANDOFF_TWIN.md`, `Vault-Code/docs/creative-twin-vision.md` and `Vault-Code/CLAUDE.md`. Start at step 0 (ask me before running any SQL). Then do step 1 on a new branch `feat/twin-signals`: add the signals table migration as a reviewable `.sql` file (do not run it), the API route, and the keep/skip logging in Design Feed and Vault, with tests. Keep replies short and ask one question at a time.

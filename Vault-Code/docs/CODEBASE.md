# Codebase map (read from the real repo, commit 754a812, 2026-10-02) — verify in phase 00, then keep short

Monorepo `AunAun`; this project lives in `Vault-Code/`. Other folders (Solo-Code, Anthem-Code, Ops-Hub) are NOT part of this work.

## What exists (do not rebuild)
| Part | Where | Notes |
|---|---|---|
| Web app | `outputs/a-plus-vault/` (`app.js` ~2k lines, vanilla JS, built by `build.mjs` + esbuild; `vercel.json` rewrites /vault /discover /moodboards to `vault.html`) | NOT Next.js. Items are localStorage-first, synced via `vaultRemote` (Supabase) when logged in. |
| API | `api/*.js`, `api/vault/*.js` (Vercel functions) using `lib/vault-api-shared.mjs` `createHandler({methods, limit, handle})`, `lib/vault-api-auth.mjs`, `lib/rate-limit.mjs`, `lib/supabase-rest.mjs` | Add new endpoints in this style. |
| Capture | `api/vault/capture.js` (JSON), `capture-file.js` (file), `captures.js`, `collections.js`, `token.js`, `health.js`; core in `lib/vault-capture-core.mjs`, store in `lib/vault-capture-store.mjs` | `buildVaultItem` + `analyzeLite` (keyword rules only, fake colors). Stored in `vault_extension_captures` (`item jsonb`, `dedupe_keys` GIN, `bearer_hash`, `user_id`). Files go to bucket `vault-assets/<userId>/extension-captures/`. |
| Auth for extension | signed token `vxt1.<userId>.<HMAC>` (`signVaultToken`), or Supabase JWT | Long-lived, user-bound. |
| Discover | `api/discover.js` (allowlisted PostgREST proxy, published only, CDN-cached) + table `discover_items` (`outputs/a-plus-vault/supabase-discover-seeder.sql`) | Columns: source, source_id, license (CHECK cc0 + attribution + rehosted + phash for `published`), tags text[], style, colors text[], category, blurhash, phash bit(64), image_sm/md/lg_path, status pending/published/rejected/hidden, reject_reason enum. |
| Seeder | `seeder/` (separate Next.js app, port 3010, Inngest, Claude vision via `@anthropic-ai/sdk`) | Adapters Met + AIC; pipeline: license gate (cc0) → download → pHash dedupe (≤6) → min 1000 px → ONE Claude call (moderation + category + tags + style + colors) → WebP 400/800/1600 + blurhash → publish. Admin `/admin/seeder`, `seeder_control.paused`, cron 03:00 Asia/Bangkok. |
| Extension | `vault-extension/` (MV3: background.js, content.js, popup.*; v0.1.4) | Context menus (image/video/link/selection/page + Snapshot), Smart Capture DOM ranking, popup panel, recent list, web-handoff fallback. Has PRIVACY.md + release checklist. |
| Migrations | `outputs/a-plus-vault/supabase-*.sql`, `Solo-Code/supabase/migrations/*` | Ask before adding any. |
| Scripts/tests | `scripts/qa.mjs`, `scripts/__tests__/*.test.mjs` (node --test), `alpha-smoke.mjs`, seeder vitest-style `*.test.ts` | Reuse these runners. |

## Gaps this pack fills
Shared bilingual taxonomy + `tags_ids`/confidence; palette computed from pixels; free-gate cascade (blur/blank, metadata tagging, tiny C1 pass, lazy C2); sentence parser + ranking + find-similar (no search exists beyond keyword filter); enrichment of USER items (T0–T3) incl. extension captures; viewer polish; feed rotation + digest; ops report + review queue; learning loop; extension upgrades (phase 11).

## Constraints that differ from earlier packs
- Stack is vanilla JS + Vercel functions + a separate Next.js seeder. Put pure logic (parser, ranking, taxonomy loader, constants) in `lib/engine/*.mjs` so BOTH `api/` and `seeder/` can import it; keep TS only inside `seeder/`.
- Constants: ONE file `config/engine.json` read by `lib/engine/config.mjs` (seeder imports the same JSON). Names unchanged from the pack.
- Existing license gate allows only `cc0` and requires rehosting; widening it is an owner decision recorded in `docs/SOURCES.md`.

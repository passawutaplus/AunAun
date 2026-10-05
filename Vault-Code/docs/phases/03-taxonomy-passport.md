# Phase 03 — Taxonomy build + Image Passport on top of the existing tables + constants

Also read (grep only): `docs/dictionary/README.md`, `docs/engine-config.json`, `outputs/a-plus-vault/supabase-discover-seeder.sql`.

## Taxonomy
1. Run `python3 docs/dictionary/build.py`; must exit 0 with 0 cross-domain collisions. Do not hand-edit vocabulary here.
2. Build `taxonomy/taxonomy.json` from the generated `dictionary.json` (facet = group; ONE synonym index th+en, lowercased → term id; parent links; `maxPerImage` per group) + `docs/engine-config.json` (phrases, word lists, cues, `group_layers`, `language_rules`). Consumers: AI tagger prompt (seeder + enrich), search parser, chips/filter UI, eval. Validate on load: ids unique, parents exist, no cycles, phrase ids exist. Tagger output with unknown ids is rejected.
3. The parser/taxonomy loader is PURE ESM in `lib/engine/` so `api/`, the seeder and the browser bundle (esbuild, lazy-loaded, gzip size reported) all import the same code.
4. UI label = `th[0]` (fallback `en[0]`). Write `docs/TAXONOMY_REVIEW.md` (≤20 lines).

## Constants
Create `config/engine.json` (one file) read by `lib/engine/config.mjs`; the seeder imports the same JSON. Names unchanged: QUALITY_PUBLISH 75 · QUALITY_REJECT 50 · TAG_MIN_CONF 0.6 · MIN_CONFIDENT_TAGS 4 · MIN_SCORE 0.5 · MIN_RESULTS 12 · MMR_LAMBDA 0.7 · USER_AI_QUOTA_FREE 20 · USER_AI_QUOTA_PLUS 300 · PRICE_SOFT_MAX 0.3 · PHASH_NEAR_DIST (reuse seeder's 6) · DOMAIN_MARGIN · color thresholds · KEEP_ALL_MIN_EDGE 400 · KEEP_ALL_MAX 60 · BATCH_MAX 20 · `OCR_ENABLED` false · `LEARN_*`. Existing seeder constants (`MIN_LONG_EDGE_PX`, `PHASH_MAX_DISTANCE`, `LICENSE_ALLOWLIST`) move here or alias it; one source of truth.

## Image Passport = existing `discover_items` + additions (show SQL once; ask before migrating)
Mapping of passport names to existing columns (do NOT duplicate): license_status ≡ `license`; credit_text ≡ `attribution`; image_url ≡ `original_image_url`/`image_*_path`; source_url, title, width, height, blurhash, phash, published_at already exist.
Add columns: `tags_json jsonb default '[]'` ([{id, facet, conf 0–1, src code|meta|ai|user}]), `tags_ids text[] default '{}'` (only conf ≥ TAG_MIN_CONF, set by the publish function), `palette jsonb`, `metrics jsonb`, `quality_score int`, `enrich_level smallint default 0`, `alt_text_th`, `alt_text_en`, `status_reason text`, `last_checked_at`, `check_fail_count int default 0`, `era/culture_region/medium/institution/year` (layer B) as needed.
Keep existing `tags text[]` = open keywords (full-text only); `colors text[]`/`style`/`category` stay for the current Discover UI until 06/07 replace their use.
Status: existing pending/published/rejected/hidden; add `review`. `pending` = candidate. Keep the `published` CHECK (cc0 + attribution + https source + rehosted + phash + dims ≥ 1000) and add: `tags_ids` cardinality ≥ MIN_CONFIDENT_TAGS and `quality_score >= QUALITY_PUBLISH`.
Indexes: GIN(`tags_ids`), GIN tsvector(title + tags + keywords).
Extend `api/discover.js` `ALLOWED_COLUMNS` with the new read columns only (keep the allowlist approach, published-only, bounded).

## New tables (all server-written, RLS on, no client policies unless stated)
`unknown_terms(term, lang, count, last_seen, status)`, `reports(item_id, reason, created_at, status)` (public insert via API only), `item_signals(item_id, type view|save|skip|open, tag_ids?, created_at)` (no user id), `eval_queries(text, expected_tag_ids, notes)`, `user_ai_usage(user_id, month, count)`, `consent_events` and `dsar_requests` (defined in phase 12). Extend existing `seeder_control` (paused) with `kill_switch` semantics for AI/email and monthly budget fields instead of a new settings table.
User items stay in their existing store; they share the passport vocabulary (`analysis.tagIds`, `palette`, `metrics`) but are never public.

## License gate (hard rule, enforced twice)
Already enforced in the pipeline and as a CHECK constraint (cc0 only). Keep both. Widening `LICENSE_ALLOWLIST` is an owner decision recorded in `docs/SOURCES.md`, and the DB constraint must be changed in the same migration. Public read path = RLS policy `status='published'` + `api/discover.js`. Unknown-license and incomplete rows are never public.

Done when: taxonomy builds and validates; `config/engine.json` exists and the seeder reads it; migration applied after approval; an unknown-license row is invisible to anonymous reads; `api/discover.js` still returns the same shape for the current UI.

# Vault Engine progress (v6 pack)
- [x] 00 verify-map (2026-10-04) - map mostly true; see differences in chat summary
- [x] 01 url-importer (2026-10-04) - api/import-url.js + lib/import/*; cache table NOT created (needs approval)
- [x] 02 save-path (2026-10-04) - web keeps local-first path (guests); see notes
- [x] 03 taxonomy-passport (2026-10-04) - migration vault_engine_passport APPLIED; 58 published rows marked legacy_published; discover.js allowlist extended
- [x] 04 seeder-audit (2026-10-04) - caps + single kill switch + vision repair + SOURCES.md; owner to run: disable chndm/si (see SOURCES.md)
- [x] 05 tagging+publish (2026-10-04) - lib/engine (palette, tags, publish, prompts, budget, enrich, golden); seeder cascade C1+C2; migration vault_engine_cascade APPLIED; T3 (private AI) NOT wired: needs phase 12 opt-in
- [x] 06 search (2026-10-04) - parser, ranking, similar, /api/search, /api/similar/[id], /api/signal, eval 20/20, own-vault #tag + Smart Collections, Discover chips; migration vault_engine_search APPLIED; NOT built: brief-mode UI/loading motion, similar button UI, OCR (flag only)
- [x] 07 image-viewer (2026-10-04) - palette strip+copy, tag pin/exclude, ambient, B&W+peek+B key, thirds, continue tabs (API), breadcrumb, mobile sheet+swipe, Top of Mind (5), add image to link-only; NOT built: per-itemType card layouts, hex chips in notes
- [x] 08 feed-digest (2026-10-04) - /api/feed daily rotation, From your past, digest builder DRY-RUN + unsubscribe (token + endpoint), digest_prefs migration APPLIED; email NOT sent (needs provider + opt-in UI/consent in 12)
- [x] 09 ops (2026-10-04) - link health, dead letters, caps/kill events, daily report (+email when env set), review queue, takedown (immediate hide trigger, restore, delete), retention, Trash 30d, RUNBOOK; migration vault_engine_ops APPLIED; NOT done: terms/privacy links (phase 12)
- [x] 11 extension v0.2.0 (2026-10-04) - quick keep+undo, Keep All picker+batch API, credit, offline queue, connected state, perms diet (no tabs; opt-in all sites), hover opt-in, shortcut, install hint, hex chips; NOT done: token_version revocation (format change), real-Chrome test pending (load unpacked)
- [ ] 12 legal-privacy-cookies
- [ ] 10 learning-loop (after launch)
Diffs vs CODEBASE.md: HEAD f0ddbda (+60 commits since 754a812); extension v0.1.5; app.js ~2500 lines; vercel.json has no crons/maxDuration; docs/ now holds the v6 pack.

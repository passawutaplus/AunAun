# Vault Engine progress (v6 pack)
- [x] 00 verify-map (2026-10-04) - map mostly true; see differences in chat summary
- [x] 01 url-importer (2026-10-04) - api/import-url.js + lib/import/*; cache table NOT created (needs approval)
- [x] 02 save-path (2026-10-04) - web keeps local-first path (guests); see notes
- [~] 03 taxonomy-passport (2026-10-04) - taxonomy+config done; SQL written NOT applied (outputs/a-plus-vault/supabase-engine-passport.sql); api/discover.js ALLOWED_COLUMNS waits for migration
- [ ] 04 seeder-audit
- [ ] 05 tagging+publish
- [ ] 06 search
- [ ] 07 image-viewer
- [ ] 08 feed-digest
- [ ] 09 ops
- [ ] 11 extension (design boards: https://claude.ai/artifact/BbSh3gPPWdjqp7fZ9oK8tP, 01-13)
- [ ] 12 legal-privacy-cookies
- [ ] 10 learning-loop (after launch)
Diffs vs CODEBASE.md: HEAD f0ddbda (+60 commits since 754a812); extension v0.1.5; app.js ~2500 lines; vercel.json has no crons/maxDuration; docs/ now holds the v6 pack.

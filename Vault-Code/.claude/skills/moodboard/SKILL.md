---
name: moodboard
description: Work on moodboards: canvas objects, palette, text, connectors, undo/history, autosave, board sharing, and export (image/PDF/palette-to-CSS). Use for any moodboard or board-share request.
---
# Moodboard
- Files: `modules/moodboard-model.js` (data/logic), `moodboard-ui.js`, `moodboard-editor-ui.js` (editor markup, objects, palette, connectors), `moodboard-autosave.js`, `moodboard-history.js`, `smart-grid.js`; board binding in `app.js` (`boardView`, `bindBoard`).
- Tables: `vault_boards`, `vault_board_objects`, `vault_board_shares` (+ supabase-moodboard-phase1.sql). Board objects reference vault items by id; never copy items.
- Sharing was hash-link based (`objectShareUrl`, `collectionShareUrl` in app.js). Before building, grep to see what share/export already exists; a real public read-only revocable board view and PNG/PDF export were NOT finished.
- Share rules: private by default; explicit "create link"; revoke anytime; read-only; show credit/source for each image; no edit rights; add `noindex`.
- Export ideas: board -> PNG/PDF; palette -> CSS variables/JSON; board -> short brief.
- Keep undo/autosave working. Add/adjust a guard in `scripts/qa.mjs` for new UI, run `npm run check` and `npm run alpha:smoke`.
- Ask for a plan first when the feature touches model + UI + DB.

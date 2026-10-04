# Golden set (owner labels ~50 images once)

1. Pick ~50 varied images (all disciplines). Put them in `golden.json`:
   `[{ "id": "<discover_items.id or any stable id>", "expected": ["gfx.poster", "mood.red", "sty.minimal"] }]`
   Ids come from `taxonomy/taxonomy.json` (search a word with `node -e` or the UI chips).
2. Export the engine's tags for the same ids as `predicted.json` (`{ "<id>": ["tag ids"] }`, e.g. `tags_ids` from `discover_items`).
3. Run `node scripts/golden-report.mjs docs/golden/golden.json predicted.json` after every prompt or model change.
   It prints precision/recall per group; precision matters most (wrong tags destroy trust).

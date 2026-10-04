# Taxonomy review (for a designer to check)

Source: `docs/dictionary/src/*.txt` + overlay `src/extra/*.txt`. Build: `python docs/dictionary/build.py` then `node scripts/build-taxonomy.mjs` (writes `taxonomy/taxonomy.json`, ~365 KB raw / ~94 KB gzip, lazy-loaded in the browser). Never hand-edit the JSON.

Size: 15 domains, 81 groups, 1,559 terms, 5,139 synonyms (Thai + English), 7 phrase rules. Build reports 0 errors and 0 cross-domain synonym collisions.

Domains (groups / terms): arc 8/131, crf 4/80, fas 6/119, gfx 6/96, ill 6/94, int 10/179, mot 6/83, pho 6/117, prd 4/71, typ 3/64, ui 6/118; cross-cutting: mat 3/101, mood 4/135, sty 4/104, sub 5/67.

Please check:
1. Thai wording is a first draft: is the first Thai label (shown in the UI) what designers actually say?
2. Missing words designers type that are not covered (note them; they become `src/*.txt` lines).
3. Terms that are too generic or that overlap between groups.
4. `maxPerImage` limits per group feel right (e.g. one building type per image).
5. Layers: mood.tone / mood.hue are computed from pixels (never asked from AI); sty.era / culture / movement come from source metadata first.

Decision recorded: a tag stores its implied parents at tag time (so searching a parent matches children without a join); revisit in phase 06 if it bloats `tags_ids`.

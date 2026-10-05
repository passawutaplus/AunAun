# Phase 06 — Search: sentence parser + ranking + find-similar

NO paid AI at query time: taxonomy.json + stored tags/palettes only. The optional AI query-rewrite stays OFF (flag, default false, not built now).
Where it lands: pure parser/ranking in `lib/engine/*.mjs` (shared by `api/search.js`, the browser bundle for My Vault search, and tests). Discover search = NEW `api/search.js` (same `createHandler` style, allowlisted columns, published-only, cacheable); do NOT loosen `api/discover.js`. The current UI only has keyword/category filter; extend that search box, no new one.
Build order: (1) parser + threshold + ranking on current tags, (2) UI, (3) similar/opposite. Deeper tags (phase 05) improve results without code changes.

## UI (extend the existing search box)
- Short text + Enter → existing search. Long text (> ~40 chars, newline, paste) → **brief mode**: multi-line box, loading motion.
- **Understanding chips**: display-only (what was understood); editing only as a secondary action. Silent trust (CLAUDE.md #5): no labels, no "not relevant" button, no "no results" text.
- Example: "ห้องนอน ราคา 30 ล้าน มินิมอลแต่มีสีสันหน่อย" → bedroom · minimal · neutral_with_accent; price ignored/soft.
- Loading motion tied to REAL stages (understanding → searching → ranking); chips appear step by step; no artificial delay; reduced-motion honored; CSS/SVG only.

## Parser (server, pure functions, heavily tested)
**Step 0 — Mixed Thai/English** ("ห้องนอน minimal แต่ใส่ pop of color, font sans bold, vibe Japandi"); config in `engine-config.json` `language_rules`:
- Split into runs by script (Thai/Latin/digits) BEFORE segmenting; Thai runs via `Intl.Segmenter('th')`, Latin by spaces/punctuation; split words glued across scripts ("ห้องbedroom").
- Latin normalize: lowercase, strip diacritics, hyphen/space/join variants ("walk-in"="walk in"), plural -s/-es and possessive, `abbrev_expand` (b&w, bg, kv, ci, cta, ds…). Thai normalize (match only): ignore tone marks, expand ๆ, unify loanword spellings (เซรามิค/เซรามิก).
- ONE synonym index (th + en) over the whole query, sliding window ≤ `multiword_window`, longest match first, so "mid century modern", "pop of color", "ไม้ ระแนง" match as units. No translation step, no separate English pass.
- **Tag and color syntax (from mymind):** `#word` = exact tag filter (pin) — but `#` + 3 or 6 hex digits (`#ff8b8b`, `#f8b`) is a COLOR query unless a tag with that name exists; color words (แดง, red, "สีฟ้า") map to hue families; the bare word `colors`/`palette`/`สี` alone lists saved palettes/color cards. Color queries use stored palettes (CIELAB distance), never image pixels at query time. Config keys `tag_prefix`, `hex_color_regex` in `engine-config.json`.
- Fuzzy (Latin only): token ≥ `latin_min_len`, edit distance ≤ `max_edit`, accepted only when exactly ONE term matches, weight × conf. Never fuzzy Thai.
- `connector_words` (แนว สไตล์ ฟีล ลุค โทน vibe feel look style…) are dropped next to a matched term but kept as hints (โทน → color intent, ฟีล/vibe → mood intent). `filler_words` never match. Unmatched words → `unknown_terms` with `lang` (phase 10 review).
- Ambiguous short English words (pop, tag, switch, tone, mono) resolve via the context domain (Pass 1); with no context accept only next to a style/mood word, else weight 0.3.

**Pass 1 — read context (no AI):**
1. Clauses: split on connectives (แต่ และ ที่ เพื่อ , newline); drop `ignore_words` from matching but keep as context ("ราคา 30 ล้าน" → luxury hint).
2. Domain context: matched terms in discipline domains (int, arc, gfx, typ, ui, pho, ill, fas, prd, mot, crf) vote for their domain, plus `domain_cues`. Winner with margin ≥ DOMAIN_MARGIN ⇒ `context.domains`; otherwise no restriction.
3. Intent from `intent_cues`: inspiration (default), color_reference, layout_reference, material_reference, mood_reference, similar_to. Intent shifts weights (color_reference ⇒ palette match ×2).

**Pass 2 — match with context:**
4. `phrases` first, then longest-synonym-first.
5. Context weighting: same-domain and cross-cutting (sty, mat, mood, sub) ×1.0; other discipline domains ×0.3 unless pinned/negated; a two-sense word takes the context-domain sense.
6. Hierarchy expansion only inside the context domain (parent ⇒ children at 0.6); never across domains.
Weights: base 1.0; `X แต่ Y` → X 1.0, Y 0.5; `หน่อย/นิดหน่อย/a bit` ×0.5; `มาก/very` ×1.3; `must_words` → required/exclude; `soft_words` ×0.8; negation → exclude; money → soft signal ≤ PRICE_SOFT_MAX.
Unknown words are never dropped silently (logged). Ask-back chips ONLY when truly ambiguous (e.g. "สีสัน" with no direction).
Output `{context:{domains:[{code,score}],intent}, include:[{id,weight,required?}], exclude:[], colorIntent, unknown:[{term,lang}]}`.

## Retrieval & ranking
- Candidates: tag overlap via GIN on `tags_ids` (~200) + weak full-text on keywords/title; rerank in code.
- score = Σ(weight×conf×matched)/Σ(weight) + small quality boost + palette/color match when color intent + small `item_signals` boost (phase 10 only).
- Precision-first: drop below MIN_SCORE even if the page is short; best-first; mixed coverage (5/5, 4/5, 3/5 interleave) unless the user pins a chip.
- **Silent relaxation**: if results < MIN_RESULTS drop the lowest-weight constraint and re-run, no message; never relax required/exclude or the discipline.
- Diversity: MMR (MMR_LAMBDA). Cursor pagination. Only published items via the license-gated read path.
- Return `matchedTags`/`missingTags` for the viewer (phase 07; missing tags tappable to require).
- Record view/save/skip/open in `item_signals`; no user effort.

## Find-similar
`GET /api/similar/:id`: weighted tag overlap by facet (+hierarchy) + palette distance (CIELAB) + optional same-era bonus; exclude seen; MMR. "Opposite": invert mood/tone. No AI.

## Smart Collections (from mymind Smart Spaces)
A collection may be defined by a saved query (text + parsed snapshot + taxonomy version). Membership is computed at read time from the parser (never copied), so new items that match appear automatically; the user may pin/remove individual items. Create one from any search with "Save this search as a collection". Own-vault only in v1; no AI. Show as a normal collection in the existing UI.

## OCR (flag only)
`OCR_ENABLED` default false: text-in-image search (posters, type) is valuable for designers but costs compute; evaluate (server job vs in-browser, Thai support) in a separate approved step. Do not build now.

## Own Vault search
Title/domain/note/own tags + user-enriched tags (T0–T3) + keywords through the same parser, running in the browser on `analysis.tagIds`/palette (items are local-first); plain text works without taxonomy; `#tag` and hex colors work here too. No autocomplete is a known weak spot elsewhere: suggest terms from taxonomy labels as the user types (free, local).

## Evaluation (dev-side, light)
`eval_queries`: ~20 sample sentences with expected tag ids, at least half mixed Thai/English (e.g. "hero section แนว brutalism ใช้ sans serif หนาๆ สี pastel", "moodboard ห้องนอน japandi warm tone ไม่เอา neon"), incl. negation, "แต่", idioms, typos. A script prints parse accuracy; re-run when the dictionary changes. Ranking tests: mixing, diversity, threshold, relaxation; p50/p95 on seeded data < 500 ms server-side.

Done when: the example brief shows correct chips; mixed-language queries parse correctly; results are mixed full/partial matches, best-first, irrelevant ones cut; sparse queries relax silently; hover shows matched tags; "more like this" works; unknown words logged with language; no external AI call at query time; eval script passes.

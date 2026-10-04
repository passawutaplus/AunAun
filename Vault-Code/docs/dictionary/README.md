# Vault Engine Dictionary

Keyword vocabulary for tagging and for the search parser. Thai + English, hierarchical: **domain > group (subcategory) > term > child term**.
Built from the structure of the Art & Architecture Thesaurus (objects / materials / styles & periods / activities / attributes) plus common design disciplines; Thai wording is a first draft and needs owner review.

## Files
- `src/*.txt` — SOURCE. Edit these (one line per term). Format at top of `build.py`.
- `build.py` — validates and writes `dictionary.json` (ids unique, parents exist, no duplicate synonym inside a group, no cycles). Run after every edit. Exit code 1 on errors.
- `dictionary.json` — generated; the tagger prompt, query parser and filter UI read this.

## Domains
Discipline domains (what the image IS): int, arc, gfx, typ, ui, pho, ill, fas, prd, mot, crf.
Cross-cutting domains (apply to every image): sty (styles, movements, eras, culture), mat (materials, textures, patterns), mood (mood, color tone/hue, composition), sub (subjects).

## How the engine uses it (phase 03/05/06); engine settings (phrases, word lists, cues, group layers, language rules) live in `docs/engine-config.json`
- Facet = dictionary group. `maxPerImage` is on the group (null = unlimited). Layer: mood.hue and clr-like tones are matched to computed layer-A color data; do not ask the AI for exact hues.
- Tagger pass 1 picks discipline domain(s). Pass 2 sends ONLY the groups of those domains + cross-cutting groups, as `id: english label` lines (no Thai synonyms) to keep the prompt small; use prompt caching for the fixed part.
- Parser: build one synonym index (th+en, lowercased) → term id; longest match first. A synonym appearing in two domains (currently none) must resolve by discipline context.
- Hierarchy: searching a parent matches its children; tag-time stores implied parents (decide once, document).
- Promote new terms from `unknown_terms`/keywords by editing `src/*.txt`, then rebuild.

## English / designer jargon overlay
`src/extra/*.txt` adds jargon, abbreviations, slang and Thai-script loanword spellings to EXISTING terms (`short_id | extra en | extra th`, grouped by `@dom code`). The first English synonym of a term stays its display label; extras are only for matching. `build.py` merges them, then runs the same validation (dupes inside a group are errors; `--cross` must stay at 0 cross-domain collisions). Add new English words there, not in the main files, unless a whole new term is needed. Mixed Thai/English query handling is in phase 06 (Step 0).

## Rules for editing
Visual-only words. No brands/trademarks, no living individuals, no prices/clients. Prefer terms designers actually type. Keep ids ascii snake_case.

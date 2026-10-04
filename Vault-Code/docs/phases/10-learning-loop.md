# Phase 10 — Learning loop (grow Vault Engine with real users, near-zero effort)

Goal: after launch the engine gets better from what people actually type and do, without paid AI at query time, without personal profiling, and with ≤ 10 minutes of owner time per week. Learning proposes; the owner approves; nothing changes silently except small bounded ranking boosts.
Prereq: phases 03, 05, 06, 07, 09 done. Ask before: DB migration (show SQL once), cron/scheduled job, env var, new dependency, sending email.
Everything here sits behind `LEARN_*` flags in `config/engine.json` (`LEARN_CAPTURE` on, the rest off until the owner enables them). Kill switch = the single `seeder_control` flag (phase 04).

## A. Capture (privacy-light)
- `search_events(id, session_id, query_text, parsed jsonb, lang_mix, result_count, relaxed bool, created_at)`; one row per search. `session_id` is a random per-TAB id in sessionStorage (not a cookie, rotates, NOT the user id, no IP); never join queries to accounts. Persistent or joinable identifiers need analytics consent (phase 12.4).
- Extend `item_signals` with `search_event_id` and `position` so a view/save/open/skip can be tied to the query that showed it.
- Do not store private-Vault searches or any text typed inside My Vault. Skip events from bots. Retention: raw rows 90 days, then keep only aggregates; delete on request. Add one sentence to the privacy notice (owner/legal review: not legal advice). Respect Do-Not-Track as opt-out.
- Never log query text that looks like an email/phone/URL (drop it).

## B. Weekly learning digest (no AI, one query job)
Computed by plain SQL, included as a short block in the phase 09 report:
- top 20 queries; zero-result and relaxed-result queries (count + examples)
- reformulations: a new search within 60 s from the same session = likely miss; list the pairs
- save-rate and open-original-rate per query cluster; queries with many views but zero saves
- top unknown words by frequency, split by language (Thai / English / mixed)
- items saved often but with few tags (candidates for pass-2 deep tagging, phase 05 queue priority 1)
- sources ranked by save-rate vs report/reject-rate

## C. Dictionary growth queue (the main lever)
- Extend `unknown_terms` with `lang`, `example_queries[]`, `suggested_term_id`, `status` (new|aliased|added|ignored). Suggestion is free: nearest existing term by edit distance (Latin) or segmenter overlap (Thai), plus co-occurring matched terms in the same query.
- Owner review UI/file: ≤ 20 rows per week, each with 3 buttons: "alias to <suggested term>", "new term" (pick group), "ignore". Never auto-add.
- Approval writes a line to `docs/dictionary/src/extra/99-learned.txt` (alias) or the right `src/*.txt` (new term), runs `build.py` (must exit 0, cross-domain collisions 0), bumps `dictionary.version`, rebuilds `taxonomy/taxonomy.json` (phase 03 step 2). A synonym change needs no re-tagging (parser-only). A NEW term is backfilled lazily: only items that get viewed/saved/returned are re-asked in pass 2 for that group.
- Promote frequent open keywords from tagging (phase 05 step D) through the same queue.

## D. Ranking boost from behavior (bounded)
- Behavior score per item per query cluster: smoothed save/open rate = (saves + k·prior) / (impressions + k), minimum impressions (default 30) before it counts, time decay (half-life 60 days).
- Boost ≤ +15% of the final score; never override MIN_SCORE or required/excluded terms; keep a 10% exploration slice so new items get seen; no popularity feedback loop across the whole feed.
- Offline check before enabling: replay `eval_queries` + golden set; the change must not lower parse accuracy or per-group precision. Log every enabled change in `learning_changelog(at, what, before, after, reason)`.

## E. Config tuning report (monthly, advice only)
One page: how often silent relaxation fired, zero-result rate, share of queries below MIN_RESULTS, average position of first save. Suggest new values for `MIN_SCORE`, `MIN_RESULTS`, MMR λ, `TAG_MIN_CONF`; the owner applies by editing the config. No automatic threshold changes.

## F. Feed learning (feeds phase 04/08)
- Shift the daily seed budget toward sources with high save-rate and low report/reject-rate; pause a source after N rejects/reports (config), flag in the report.
- Discover ordering: fresh + diverse first; behavior boost from D only. No personalization per user in v1.

## G. Guardrails
- No per-user profiles, no cross-user private data, no paid AI call added at query time.
- Every learning output is reviewable and reversible (changelog + dictionary in git).
- Reports (reports table, takedown) always outrank learning signals.
- Bias check monthly: share of results by source/culture/discipline; if one source exceeds a configured share, down-weight it.

## Owner routine
Weekly (≤10 min): approve/alias/ignore the dictionary queue. Monthly (≤15 min): read the tuning report and decide. Everything else runs unattended and appears as 3–4 lines in the daily report.

## Tests
Capture drops PII-like text; session id never equals user id; aliasing a term makes the mixed Thai/English query resolve on the next build; behavior boost respects the +15% cap, min impressions and decay; boost off ⇒ identical results to phase 06; kill switch stops capture and boosts; retention job deletes raw rows after 90 days and keeps aggregates.

Done when: weekly digest appears in the report; unknown words (Thai and English) reach the review queue with suggestions; approving one alias changes search results after rebuild without re-tagging; bounded behavior boost works and can be turned off; changelog and retention job work; owner time stays within the routine above.

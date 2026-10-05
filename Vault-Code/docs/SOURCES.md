# Discover sources (phase 04) - read the terms, then decide

Rule: at most 2 sources enabled until phase 05 passes the golden-set checks. Widening `LICENSE_ALLOWLIST` (config/engine.json) is an owner decision recorded here; NC/ND is never allowed. Reviewed 2026-10-04 from the providers' own pages; re-read before enabling anything new.

| Source | Status | Licence / terms (summary) | Limits | Notes |
|---|---|---|---|---|
| Met (`met`) | APPROVED, enabled | Open Access = CC0 for public-domain works; no key, no extra terms. | Asked to stay under 80 requests/s. | Credit "The Metropolitan Museum of Art" is courtesy. Re-hosting allowed (CC0). |
| Cleveland (`cma`) | APPROVED, enabled | Data and images CC0 only where `share_license_status` = CC0; others have no CC0 image. | No stated limit; be gentle. | Daily refresh. Credit appreciated, not required. |
| Art Institute of Chicago (`aic`) | CONDITIONAL, disabled | Metadata CC0 (description text CC BY 4.0); public-domain images via IIIF. They prefer hot-linking; credit line "Digital image courtesy of the Art Institute of Chicago". | 60 req/min anonymous; image scraping one at a time, ~1 s apart; no paging past 10,000 results. | Keep disabled until IIIF is proven from Vercel (403 from dev) and the owner accepts re-hosting despite their hot-link preference. |
| Rijksmuseum | CANDIDATE, no adapter | Images and data CC0; API key from a Rijksstudio account (free). Creator credit is good practice. | Not reviewed in detail. | Needs an adapter + key; best next source after phase 05 (strong design/print holdings). |
| Wikimedia Commons | CANDIDATE, no adapter | Per-file licences (many CC BY / CC BY-SA, some NC-free only). Must filter to the allowlist and carry author + licence URL. | User-Agent with contact is mandatory; unidentified clients are throttled/blocked; obey delay instructions. | Partly reachable through Openverse (`ov`). |
| Smithsonian (`si`) | CONDITIONAL, disabled | CC0 Open Access subset via api.data.gov key (`SMITHSONIAN_API_KEY`). | Key rate limits. | Adapter exists; not enabled while the 2-source rule applies. |
| Cooper Hewitt (`chndm`) | DISABLED | Open data; the adapter's cursor is stuck at a large offset (blocked migration noted in memory). | - | Fix cursor before any re-enable. |
| Openverse (`ov`) | DISABLED | Aggregator with mixed licences; only the allowlist may pass; credit required for CC BY / BY-SA. | - | Hard to guarantee per-item rights; keep off. |
| Unsplash, Pexels | NOT_APPROVED | API terms forbid building a competing gallery / storing and re-serving images (see `seeder/README.md` step 7). | - | Never scrape or bulk-fetch. |
| Pinterest, Behance, Google Images, Instagram | NOT_APPROVED | Forbid scraping; no suitable open licence. | - | The extension only saves what the user chooses on their own page. |

## Taxonomy hints per adapter (used by phase 05.B)
Adapters should return `classification -> discipline domain`, `date -> era`, `medium`, `culture`, `creator`, `institution` (see `docs/dictionary`). Met: `classification`, `objectDate`, `medium`, `culture`. Cleveland: `type`, `creation_date`, `technique`, `culture`. AIC: `classification_titles`, `date_display`, `medium_display`, `place_of_origin`.

## State changes still to apply (needs the owner or an explicit allow rule)
At the time of writing four sources were enabled in `seed_targets` (met, cma, chndm, si). The 2-source rule needs this one-off statement (the assistant's attempt was blocked by the permission classifier, so it was NOT run):

```sql
update public.seed_targets set enabled = false where source in ('chndm', 'si');
```

## Audit notes (2026-10-04)
- Live: 58 published (met 27, cma 19, chndm 12), 91 rejected, of which 86 `ai_invalid_output` (85 = model returned `tags` as a string or an over-long tag). Fixed in `seeder/src/seeder/vision.ts` (`repairVisionOutput`), so those images are no longer wasted AI spend.
- Idempotency: `UNIQUE(source, source_id)` + `filter-existing` step; a halted batch no longer advances the cursor.
- Every rejected row carries a `reject_reason` (CHECK in the original migration).
- Nothing is public unless the `published` CHECK passes (licence allowlist, credit, https source, re-hosted renditions, pHash, size, and now the passport rule or `legacy_published`).
- Kill switch: `seeder_control.kill_switch` stops seeding, AI analysis (re-checked before every item) and email (`lib/engine/kill-switch.mjs`, fail-closed). `paused` only stops seeding.
- Caps (config/engine.json): items per run/day, AI calls per run/day, monthly AI USD (env `SEEDER_BUDGET_USD` overrides). Hitting a cap stops the batch; the reason is returned by the job and shown on `/admin/seeder`. Persisting it for the daily report is phase 09.

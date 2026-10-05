# Phase 04 — Seeder: audit and extend what exists

The seeder (`Vault-Code/seeder`, Next.js + Inngest, Met + AIC adapters, cc0 gate, pHash, one Claude vision call, rehosted WebP, `seeder_control.paused`, cron 03:00 Asia/Bangkok) already runs. This phase verifies and hardens it; it does not rebuild it. Read `seeder/README.md` and `docs/CODEBASE.md`.

## 1. Audit (report ≤20 lines, then proceed)
- Run the seeder tests; list failures. Confirm idempotency (`UNIQUE(source, source_id)`, re-run creates no duplicates, resumable batches) and that one source failing never stops the others.
- Confirm rejected rows always carry `reject_reason`; confirm nothing is public unless the `published` CHECK passes.
- Confirm kill switch: `paused` stops fetching; extend so ONE flag also stops AI calls and emails (used by phase 09).
- Confirm AIC status (IIIF 403 from dev) and whether it works from Vercel; keep it disabled until proven.

## 2. Sources (research first → `docs/SOURCES.md`)
For Met, AIC and each candidate (Cleveland, Rijksmuseum, Wikimedia Commons, Unsplash, Pexels, open design sources): READ the current official terms; record endpoint, auth, rate limits, reusable licenses, attribution text, hotlink vs re-host rules, metadata→taxonomy mapping (classification→discipline, date→era, medium, culture). Unclear → `NOT_APPROVED`, ask owner. Enable at most 2 sources until phase 05 passes golden-set checks. The DB constraint allows `unsplash`/`pexels` as source names but `license='cc0'` only: do not widen it without an owner decision.
Adapters return normalized items plus taxonomy hints (classification, medium, era, culture, creator, institution) that phase 05.B uses.

## 3. Limits and cost
Add a per-run and per-day cap (items, AI calls) and a monthly AI cost cap read from `config/engine.json`/env; hitting a cap stops the job and is reported (phase 09). Log per-stage counts. Admin `/admin/seeder` (exists) shows caps and reasons.

## 4. Until phase 05
Items the seeder publishes today carry old-style `tags`/`colors`. Do not change the vision prompt here; phase 05 replaces it. `DEV_AUTOPUBLISH` is not needed.

Done when: audit report delivered; tests pass; caps and the single kill switch work; `docs/SOURCES.md` exists with approved/not-approved per source.

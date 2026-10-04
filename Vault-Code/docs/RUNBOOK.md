# Vault Engine runbook (read when something looks wrong)

**Daily:** read the report at `/admin/review` (stored 08:00 Bangkok; emailed only if `RESEND_API_KEY` + `OWNER_REPORT_EMAIL` are set). Urgent = cap reached, source down 2+ days, kill switch on, data request overdue.

**Stop everything (kill switch):** `/admin/seeder` -> "Kill switch". One flag (`seeder_control.kill_switch`) stops seeding, AI analysis (checked before every item) and email. Flip it back the same way. `Pause` only stops seeding.
Emergency without the UI: `update public.seeder_control set kill_switch = true;`

**Caps:** `config/engine.json` SEEDER_MAX_ITEMS_PER_RUN/DAY, SEEDER_MAX_AI_CALLS_PER_RUN/DAY, SEEDER_MONTHLY_AI_USD (env `SEEDER_BUDGET_USD` overrides). Hitting one stops the batch, logs an `ops_events` row and shows in the report.

**Takedown / report:** copyright or offensive reports hide the image immediately (DB trigger). Go to `/admin/reports`: "คืนรูป" (restore), "ลบถาวร" (files removed, row kept as tombstone so it is never re-imported), or dismiss. Reply to the claimant's email within the legal timeline (see docs/legal when phase 12 is done).

**Review queue:** `/admin/review` -> approve (publishes) or reject items the engine was unsure about.

**Broken links:** weekly job checks stored renditions; 3 failures in a row hide the item (`status_reason` starts with `link_health`), recovery restores it. Dead letters (jobs that failed after all retries) are in `dead_letters` and in the report.

**Grow the taxonomy:** `/admin/review` -> unknown terms -> propose a synonym (id like `sty.minimal`). Then edit `docs/dictionary/src/*.txt` (or `src/extra`), run `python docs/dictionary/build.py` and `npm run taxonomy:build`, run `node scripts/eval-search.mjs`, commit. After any tagger/prompt change run `node scripts/golden-report.mjs`.

**Rotate keys:** Supabase service role, `ANTHROPIC_API_KEY`, `VAULT_EXTENSION_TOKEN_SECRET` (invalidates extension tokens), `DIGEST_UNSUB_SECRET`, `INNGEST_*`: change in Vercel env, redeploy. Never paste keys in chat or commit `.env*`.

**Retention (automatic, 03:30):** trash 30 days is local to each device; server purges `item_signals` > 90 days, old ops rows, resolved dead letters.

**Jobs:** Inngest functions `seeder-batch`, `seeder-scheduler` (03:00), `ops-daily-report` (08:00), `ops-link-health` (Sun 04:00), `ops-retention` (03:30). Register `https://<seeder-domain>/api/inngest` in Inngest Cloud after each deploy.

## Incident (data exposed or lost)
1. **Detect:** unexpected reports, Supabase/Vercel alerts, a key pasted somewhere public.
2. **Contain:** flip the kill switch (`/admin/seeder`); rotate the exposed secret (service role, `VAULT_EXTENSION_TOKEN_SECRET`, `ANTHROPIC_API_KEY`, `DIGEST_UNSUB_SECRET`) in Vercel and redeploy; revoke sessions if needed.
3. **Assess:** what data, how many people, was it readable (private vs public)? Write it down with times.
4. **Notify:** if personal data was breached and there is a risk to people, tell the Thai authority (PDPC) **within 72 hours of becoming aware**, and tell affected users without delay when the risk is high (counsel confirms the exact rules). Templates: `docs/legal/INCIDENT_TEMPLATES.md`.
5. **Record:** what happened, what was done, what changes (add a line here).

# Growth Engine migration test (local, throwaway Postgres)

Checks `migrations/20261120100000_growth_engine_schema.sql` (DRAFT, not applied) on a scratch Postgres 17:
stubs for `auth.uid()` / `has_role`, apply the migration twice, then `behaviour.sql` asserts the safeguards:
owner-only approvals bound to sha256 hashes, new version revokes stale jobs, no skipped status, Pause All,
idempotency + one live job per slot, reconcile before retry, task lease + dependencies, BLOCKED_BUDGET with one
notice per credit cycle, RLS (admin only, anon denied), append-only tables, audit rows.

```bash
initdb -D /tmp/ge-pg --auth=trust -U postgres && pg_ctl -D /tmp/ge-pg -o "-p 54329" start
PGPORT=54329 ./run.sh
pg_ctl -D /tmp/ge-pg stop && rm -rf /tmp/ge-pg
```

Limits: no PostgREST, no real Supabase roles/ownership. Last run 2026-11-20: 36 ok, 0 failed.

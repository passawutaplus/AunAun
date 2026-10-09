# Local migration tests (no Supabase branch)

Supabase branching needs the Pro plan, so the `20261007*` migrations are tested on a throwaway local Postgres 17.

- `bootstrap.sql` — Supabase-like roles + `auth.uid()/auth.role()` + the tables the migrations touch
  (shapes, CHECKs, triggers and RLS policies copied read-only from production on 2026-10-09; the money
  trigger is the **pre-fix** production body so BEFORE/AFTER can be compared).
- `create_report.sql` — verbatim production `public.create_report`.
- `oracle.ts` — expected hire-order amounts generated from the real `src/lib/payments/fees.ts` (264 cases).
- `before.sql` / `after.sql` — assertions; results land in `t.results`.
- `run_all.sh` — rebuilds the test DB and prints BEFORE (problem reproduced) and AFTER (fixed) results.

Limits: not a real Supabase stack (no PostgREST, no `supabase_admin` ownership, `messages` RLS omitted).
Regenerate `bootstrap.sql` shapes if the production tables change.

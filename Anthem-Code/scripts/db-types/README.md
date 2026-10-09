# Database types

`src/integrations/supabase/types.generated.ts` holds raw types for the `public`, `anthem`
and `shared` schemas. `types.ts` builds the routed `Database` type the app uses
(it mirrors `tableRouting.ts`). Regenerate whenever the schema changes:

1. Public schema — Supabase type generator:
   `npx supabase gen types typescript --project-id zkflkpbmbozrchqncpzi --schema public > /tmp/public.ts`
2. anthem + shared catalog:
   `psql "$DATABASE_URL" -At -f scripts/db-types/catalog.sql > /tmp/catalog.json`
3. Merge:
   `python3 scripts/db-types/gen_types.py /tmp/catalog.json /tmp/public.ts src/integrations/supabase/types.generated.ts`
4. Add `/* eslint-disable */` as the first line, then hand-add signatures for any non-public RPC
   the app calls (see `ANTHEM_RPC_NAMES` / `SHARED_RPC_NAMES` in `tableRouting.ts`).

When the app starts using a table or RPC outside `public`, add it to `tableRouting.ts` — the
router and the types both read from there.

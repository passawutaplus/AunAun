# Anthem Supabase ownership

Anthem and Solo share one Supabase project (`zkflkpbmbozrchqncpzi`).
**The only migration history that reaches production is `Solo-Code/supabase/migrations/`.**

- Add or change schema there, push with `Solo-Code/scripts/supabase-push-via-api.sh`,
  then regenerate types (`scripts/db-types/README.md`).
- Never run SQL by hand against production without the same file in that folder. Direct-apply
  scripts (`apply-*.mjs`) were removed on 2026-10-07 because they caused the drift described in
  `docs/db-drift-2026-10-07.md`.

## `legacy-migrations-NOT-APPLIED/`

The old pre-unification Anthem migrations. **They are not applied to production** and must not be
deployed as-is. Kept only as reference for objects the app still calls but the database lacks
(ads, AML, contracts, studio formation …) — port the definition into a new file under
`Solo-Code/supabase/migrations/`, adapted to the `anthem` / `shared` schemas, test on a Supabase
branch, then apply.

`manual/` holds one-off demo SQL, not part of the migration history.

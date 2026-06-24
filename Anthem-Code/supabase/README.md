# Anthem Supabase Ownership

Anthem and Solo use one shared Supabase project. The canonical production migration history and Edge Functions live in the public `Solo-Code` repository:

`https://github.com/passawutaplus/Solo-Code`

Apply the Solo migrations in timestamp order before deploying Anthem. In particular, Anthem community and chat hardening is defined in:

`supabase/migrations/20260622120000_anthem_community_production_hardening.sql`

Files in this directory are retained for Anthem-specific seed/reference history. Do not deploy two independently edited copies of the same production migration.

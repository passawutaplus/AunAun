-- Tighten: anon must not UPDATE profiles.opportunity_note (idempotent with grant migration).

REVOKE UPDATE (opportunity_note) ON public.profiles FROM anon;

NOTIFY pgrst, 'reload schema';
-- Column grants for opportunity_note. UPDATE is authenticated-only (RLS still applies).

GRANT SELECT, INSERT, UPDATE, REFERENCES (opportunity_note) ON public.profiles TO authenticated;
GRANT SELECT, REFERENCES (opportunity_note) ON public.profiles TO anon;
REVOKE UPDATE (opportunity_note) ON public.profiles FROM anon;

NOTIFY pgrst, 'reload schema';
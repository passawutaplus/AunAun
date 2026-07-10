-- New column opportunity_note was missing UPDATE for authenticated (PATCH returned 403).

GRANT SELECT, INSERT, UPDATE, REFERENCES (opportunity_note) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, REFERENCES (opportunity_note) ON public.profiles TO anon;

NOTIFY pgrst, 'reload schema';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE UPDATE ON public.articles FROM sandbox_exec;
  END IF;
END $$;
REVOKE UPDATE ON public.articles FROM postgres, authenticator, anon, authenticated, service_role;
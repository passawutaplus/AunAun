REVOKE ALL ON FUNCTION public.purge_old_storage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_storage() TO postgres, service_role;
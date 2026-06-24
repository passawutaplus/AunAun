-- Grant UPDATE on articles to authenticator/anon roles temporarily for bulk content refresh
GRANT UPDATE ON public.articles TO postgres, authenticator, anon, authenticated, service_role;
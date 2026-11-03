-- ENG-12: admin_event_similar() calls pg_trgm's similarity() through its search_path.
-- pg_trgm lives in `public` today, so the function works; add `extensions` so the
-- duplicate check keeps working if the extension is moved out of `public`
-- (the Supabase advisor recommends that move).
ALTER FUNCTION public.admin_event_similar(text, date, text)
  SET search_path = anthem, public, extensions;

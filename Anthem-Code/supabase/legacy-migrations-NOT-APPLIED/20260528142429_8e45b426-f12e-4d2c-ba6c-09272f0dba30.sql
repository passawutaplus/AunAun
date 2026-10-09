CREATE OR REPLACE FUNCTION public.increment_project_view(_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.projects
  SET views = views + 1
  WHERE id = _project_id AND status = 'Published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_project_view(uuid) TO anon, authenticated;
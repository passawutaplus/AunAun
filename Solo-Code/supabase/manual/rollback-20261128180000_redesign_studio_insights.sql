-- Rollback of 20261128180000_redesign_studio_insights.sql: view RPCs back to counting the total only,
-- drop studio_insights and the per-day table (its counts are lost).

DROP FUNCTION IF EXISTS public.studio_insights(integer);

CREATE OR REPLACE FUNCTION anthem.increment_project_view(_project_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
  UPDATE anthem.projects
  SET views = coalesce(views, 0) + 1
  WHERE id = _project_id AND status = 'Published';
$function$;

CREATE OR REPLACE FUNCTION public.increment_project_view(_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE anthem.projects
  SET views = coalesce(views, 0) + 1
  WHERE id = _project_id
    AND status = 'Published';
END;
$function$;

DROP TABLE IF EXISTS anthem.project_view_days;

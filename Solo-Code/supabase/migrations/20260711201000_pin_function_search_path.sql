-- Security hardening: pin search_path on our own functions (advisor:
-- function_search_path_mutable). All 16 use fully-qualified object names or only
-- touch NEW/OLD, so an empty search_path is safe and prevents search-path hijack.

alter function anthem.enforce_project_canvas_templates_limit() set search_path = '''';
alter function anthem.set_project_canvas_templates_updated_at() set search_path = '''';
alter function anthem.set_project_series_updated_at() set search_path = '''';

alter function ops.assign_issue_number() set search_path = '''';
alter function ops.format_issue_number(bigint) set search_path = '''';
alter function ops.touch_issues_updated_at() set search_path = '''';

alter function public._ai_daily_credit_limit() set search_path = '''';
alter function public._ai_daily_period_end() set search_path = '''';
alter function public._ai_daily_period_key() set search_path = '''';
alter function public._catalog_demo_project_id(integer) set search_path = '''';
alter function public._catalog_demo_uid(integer) set search_path = '''';
alter function public._design_drill_day_key() set search_path = '''';
alter function public._profile_auth_id(uuid) set search_path = '''';
alter function public._unsplash_art(integer, integer, integer) set search_path = '''';
alter function public.bangkok_today() set search_path = '''';
alter function public.set_updated_at() set search_path = '''';

-- Per-user storage quota (DB rows + file storage) with tier limits.

CREATE TABLE IF NOT EXISTS public.storage_tier_config (
  tier text PRIMARY KEY CHECK (tier IN ('free', 'pro', 'inhouse')),
  limit_bytes bigint NOT NULL CHECK (limit_bytes > 0),
  per_seat boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.storage_tier_config (tier, limit_bytes, per_seat) VALUES
  ('free', 100::bigint * 1024 * 1024, false),
  ('pro', 5::bigint * 1024 * 1024 * 1024, false),
  ('inhouse', 10::bigint * 1024 * 1024 * 1024, true)
ON CONFLICT (tier) DO NOTHING;

GRANT SELECT ON public.storage_tier_config TO authenticated, service_role;

-- Row-size helper for a user-scoped table
CREATE OR REPLACE FUNCTION public._user_rows_bytes(_user_id uuid, _sql text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_bytes bigint;
BEGIN
  EXECUTE _sql INTO v_bytes USING _user_id;
  RETURN COALESCE(v_bytes, 0);
END;
$$;

REVOKE ALL ON FUNCTION public._user_rows_bytes(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._storage_user_limit(_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tier text;
  v_cfg record;
  v_seats integer;
BEGIN
  SELECT COALESCE(p.subscription_tier, 'free'), COALESCE(p.subscription_seats, 1)
    INTO v_tier, v_seats
    FROM public.profiles p
   WHERE p.user_id = _user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_seats := 1;
  END IF;

  SELECT * INTO v_cfg FROM public.storage_tier_config WHERE tier = v_tier;
  IF NOT FOUND THEN
    RETURN 100::bigint * 1024 * 1024;
  END IF;

  IF v_cfg.per_seat THEN
    RETURN v_cfg.limit_bytes * GREATEST(v_seats, 1);
  END IF;

  RETURN v_cfg.limit_bytes;
END;
$$;

REVOKE ALL ON FUNCTION public._storage_user_limit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_storage_summary(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  v_tier text;
  v_limit bigint;
  v_db_documents bigint := 0;
  v_db_suppliers bigint := 0;
  v_db_jobs bigint := 0;
  v_db_finance bigint := 0;
  v_db_brand bigint := 0;
  v_db_planner bigint := 0;
  v_db_other bigint := 0;
  v_file_documents bigint := 0;
  v_file_suppliers bigint := 0;
  v_file_jobs bigint := 0;
  v_file_finance bigint := 0;
  v_file_brand bigint := 0;
  v_file_planner bigint := 0;
  v_file_other bigint := 0;
  v_db_total bigint;
  v_file_total bigint;
  v_total bigint;
  v_uid text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_uid := _user_id::text;
  v_tier := public._ai_user_tier(_user_id);
  v_limit := public._storage_user_limit(_user_id);

  -- ── Database footprint by category ──
  v_db_documents := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.quotations t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_documents t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_usage_rights t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_checklist_progress t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_license_tokens t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_clients_invoices t WHERE t.user_id = $1');

  v_db_suppliers := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.suppliers t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.supplier_files t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.supplier_links t WHERE t.user_id = $1');

  v_db_jobs := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.job_trackers t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(m)), 0) FROM public.job_milestones m JOIN public.job_trackers j ON j.id = m.job_id WHERE j.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(s)), 0) FROM public.job_slips s JOIN public.job_trackers j ON j.id = s.job_id WHERE j.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_jobs t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_job_tasks t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.feedback_jobs t WHERE t.user_id = $1');

  v_db_finance := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_expenses t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_incomes t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_subscriptions t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_payment_methods t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_deductions t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_settings t WHERE t.user_id = $1');

  v_db_brand := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.asset_items t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.profiles t WHERE t.user_id = $1');

  v_db_planner := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.planner_posts t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.work_projects t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.review_pins t WHERE t.user_id = $1');

  v_db_other := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.saved_clients t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_notes t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_tasks t WHERE t.user_id = $1');

  -- ── File storage by bucket → category ──
  SELECT
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('legal-certificates') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('supplier-files', 'supplier-covers') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('job-tracker', 'brief-references') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('expense-receipts', 'wht-certificates') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('brand-logos') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('chat-images', 'ticket-attachments') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0)
  INTO v_file_documents, v_file_suppliers, v_file_jobs, v_file_finance, v_file_brand, v_file_other
  FROM storage.objects o
  WHERE split_part(o.name, '/', 1) = v_uid;

  v_db_total := v_db_documents + v_db_suppliers + v_db_jobs + v_db_finance + v_db_brand + v_db_planner + v_db_other;
  v_file_total := v_file_documents + v_file_suppliers + v_file_jobs + v_file_finance + v_file_brand + v_file_planner + v_file_other;
  v_total := v_db_total + v_file_total;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'total_bytes', v_total,
    'limit_bytes', v_limit,
    'db_bytes', v_db_total,
    'file_bytes', v_file_total,
    'remaining_bytes', GREATEST(0, v_limit - v_total),
    'categories', jsonb_build_array(
      jsonb_build_object('key', 'documents', 'bytes', v_db_documents + v_file_documents),
      jsonb_build_object('key', 'suppliers', 'bytes', v_db_suppliers + v_file_suppliers),
      jsonb_build_object('key', 'jobs', 'bytes', v_db_jobs + v_file_jobs),
      jsonb_build_object('key', 'finance', 'bytes', v_db_finance + v_file_finance),
      jsonb_build_object('key', 'brand_assets', 'bytes', v_db_brand + v_file_brand),
      jsonb_build_object('key', 'planner', 'bytes', v_db_planner + v_file_planner),
      jsonb_build_object('key', 'other', 'bytes', v_db_other + v_file_other)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_storage_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_storage_summary(uuid) TO authenticated, service_role;

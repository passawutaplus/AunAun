-- Fix ambiguous "feature" column reference by aliasing CTE columns
CREATE OR REPLACE FUNCTION public.get_feature_data_stats()
RETURNS TABLE(
  feature text,
  table_name text,
  total_records bigint,
  unique_users bigint,
  avg_per_user numeric,
  max_per_user bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH per_feature AS (
    SELECT 'ใบเสนอราคา (Quotations)'::text AS feat, 'quotations'::text AS tbl, q.user_id AS uid FROM public.quotations q
    UNION ALL SELECT 'ลูกค้า (Saved Clients)', 'saved_clients', sc.user_id FROM public.saved_clients sc
    UNION ALL SELECT 'Suppliers', 'suppliers', s.user_id FROM public.suppliers s
    UNION ALL SELECT 'ไฟล์ Supplier', 'supplier_files', sf.user_id FROM public.supplier_files sf
    UNION ALL SELECT 'ลิงก์ Supplier', 'supplier_links', sl.user_id FROM public.supplier_links sl
    UNION ALL SELECT 'รายรับ (Income)', 'finance_incomes', fi.user_id FROM public.finance_incomes fi
    UNION ALL SELECT 'รายจ่าย (Expenses)', 'finance_expenses', fe.user_id FROM public.finance_expenses fe
    UNION ALL SELECT 'Subscriptions', 'finance_subscriptions', fs.user_id FROM public.finance_subscriptions fs
    UNION ALL SELECT 'วิธีชำระเงิน', 'finance_payment_methods', pm.user_id FROM public.finance_payment_methods pm
    UNION ALL SELECT 'ลดหย่อนภาษี', 'finance_deductions', fd.user_id FROM public.finance_deductions fd
    UNION ALL SELECT 'ใบแจ้งหนี้ลูกค้า', 'finance_clients_invoices', ci.user_id FROM public.finance_clients_invoices ci
    UNION ALL SELECT 'พอร์ตโฟลิโอ', 'portfolio_projects', pp.user_id FROM public.portfolio_projects pp
    UNION ALL SELECT 'คอมเมนต์พอร์ต', 'portfolio_comments', pc.user_id FROM public.portfolio_comments pc
    UNION ALL SELECT 'การกดถูกใจ', 'portfolio_likes', pl.user_id FROM public.portfolio_likes pl
    UNION ALL SELECT 'คำขอจ้างงาน', 'hire_requests', hr.owner_user_id FROM public.hire_requests hr
    UNION ALL SELECT 'การแจ้งเตือน', 'notifications', n.user_id FROM public.notifications n
    UNION ALL SELECT 'Beta Feedback', 'beta_feedback', bf.user_id FROM public.beta_feedback bf
  ),
  per_user AS (
    SELECT pf.feat, pf.tbl, pf.uid, COUNT(*)::bigint AS cnt
    FROM per_feature pf
    GROUP BY pf.feat, pf.tbl, pf.uid
  )
  SELECT
    pu.feat,
    pu.tbl,
    SUM(pu.cnt)::bigint,
    COUNT(DISTINCT pu.uid)::bigint,
    ROUND(AVG(pu.cnt)::numeric, 2),
    MAX(pu.cnt)::bigint
  FROM per_user pu
  GROUP BY pu.feat, pu.tbl
  ORDER BY SUM(pu.cnt) DESC;
END;
$$;

-- Daily trend per feature, from feature_usage_events
CREATE OR REPLACE FUNCTION public.get_feature_usage_trend(_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  feature text,
  events bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    (e.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
    e.feature,
    COUNT(*)::bigint AS events,
    COUNT(DISTINCT e.user_id)::bigint AS unique_users
  FROM public.feature_usage_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1, 2
  ORDER BY 1 ASC, 3 DESC;
END;
$$;
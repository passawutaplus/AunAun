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
    SELECT 'ใบเสนอราคา (Quotations)'::text AS feature, 'quotations'::text AS table_name, user_id FROM public.quotations
    UNION ALL
    SELECT 'ลูกค้า (Saved Clients)', 'saved_clients', user_id FROM public.saved_clients
    UNION ALL
    SELECT 'Suppliers', 'suppliers', user_id FROM public.suppliers
    UNION ALL
    SELECT 'ไฟล์ Supplier', 'supplier_files', user_id FROM public.supplier_files
    UNION ALL
    SELECT 'ลิงก์ Supplier', 'supplier_links', user_id FROM public.supplier_links
    UNION ALL
    SELECT 'รายรับ (Income)', 'finance_incomes', user_id FROM public.finance_incomes
    UNION ALL
    SELECT 'รายจ่าย (Expenses)', 'finance_expenses', user_id FROM public.finance_expenses
    UNION ALL
    SELECT 'Subscriptions', 'finance_subscriptions', user_id FROM public.finance_subscriptions
    UNION ALL
    SELECT 'วิธีชำระเงิน', 'finance_payment_methods', user_id FROM public.finance_payment_methods
    UNION ALL
    SELECT 'ลดหย่อนภาษี', 'finance_deductions', user_id FROM public.finance_deductions
    UNION ALL
    SELECT 'ใบแจ้งหนี้ลูกค้า', 'finance_clients_invoices', user_id FROM public.finance_clients_invoices
    UNION ALL
    SELECT 'พอร์ตโฟลิโอ', 'portfolio_projects', user_id FROM public.portfolio_projects
    UNION ALL
    SELECT 'คอมเมนต์พอร์ต', 'portfolio_comments', user_id FROM public.portfolio_comments
    UNION ALL
    SELECT 'การกดถูกใจ', 'portfolio_likes', user_id FROM public.portfolio_likes
    UNION ALL
    SELECT 'คำขอจ้างงาน', 'hire_requests', owner_user_id FROM public.hire_requests
    UNION ALL
    SELECT 'การแจ้งเตือน', 'notifications', user_id FROM public.notifications
    UNION ALL
    SELECT 'Beta Feedback', 'beta_feedback', user_id FROM public.beta_feedback
  ),
  per_user AS (
    SELECT feature, table_name, user_id, COUNT(*)::bigint AS cnt
    FROM per_feature
    GROUP BY feature, table_name, user_id
  )
  SELECT
    pu.feature,
    pu.table_name,
    SUM(pu.cnt)::bigint AS total_records,
    COUNT(DISTINCT pu.user_id)::bigint AS unique_users,
    ROUND(AVG(pu.cnt)::numeric, 2) AS avg_per_user,
    MAX(pu.cnt)::bigint AS max_per_user
  FROM per_user pu
  GROUP BY pu.feature, pu.table_name
  ORDER BY total_records DESC;
END;
$$;
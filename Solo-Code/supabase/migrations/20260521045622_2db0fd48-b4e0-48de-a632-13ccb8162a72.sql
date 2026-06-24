
DROP FUNCTION IF EXISTS public.notify_on_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_like() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_hire() CASCADE;
DROP FUNCTION IF EXISTS public.validate_hire_request() CASCADE;
DROP FUNCTION IF EXISTS public.moderate_portfolio_comment() CASCADE;
DROP FUNCTION IF EXISTS public.bump_comment_report_count() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_portfolio_project_storage() CASCADE;
DROP FUNCTION IF EXISTS public.reject_base64_portfolio_cover() CASCADE;

DROP TABLE IF EXISTS public.portfolio_comment_reports CASCADE;
DROP TABLE IF EXISTS public.portfolio_comments CASCADE;
DROP TABLE IF EXISTS public.portfolio_likes CASCADE;
DROP TABLE IF EXISTS public.hire_requests CASCADE;
DROP TABLE IF EXISTS public.portfolio_projects CASCADE;
DROP TABLE IF EXISTS public.archetype_results CASCADE;

CREATE OR REPLACE FUNCTION public.get_feature_data_stats()
 RETURNS TABLE(feature text, table_name text, total_records bigint, unique_users bigint, avg_per_user numeric, max_per_user bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UNION ALL SELECT 'การแจ้งเตือน', 'notifications', n.user_id FROM public.notifications n
    UNION ALL SELECT 'Beta Feedback', 'beta_feedback', bf.user_id FROM public.beta_feedback bf
  ),
  per_user AS (
    SELECT pf.feat, pf.tbl, pf.uid, COUNT(*)::bigint AS cnt
    FROM per_feature pf
    GROUP BY pf.feat, pf.tbl, pf.uid
  )
  SELECT pu.feat, pu.tbl, SUM(pu.cnt)::bigint, COUNT(DISTINCT pu.uid)::bigint,
         ROUND(AVG(pu.cnt)::numeric, 2), MAX(pu.cnt)::bigint
  FROM per_user pu
  GROUP BY pu.feat, pu.tbl
  ORDER BY SUM(pu.cnt) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
 RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  rec RECORD;
  warn text[];
  ann RECORD;
  obj_path text;
  did_auth boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id FROM public.profiles p
     WHERE p.is_active = false AND p.purge_after IS NOT NULL
       AND p.purge_after <= now() AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];
    did_auth := false;

    BEGIN DELETE FROM public.supplier_files WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_files:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_links WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_links:' || SQLERRM); END;
    BEGIN DELETE FROM public.suppliers WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('suppliers:' || SQLERRM); END;
    BEGIN DELETE FROM public.saved_clients WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('saved_clients:' || SQLERRM); END;
    BEGIN DELETE FROM public.quotations WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('quotations:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_clients_invoices WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_clients_invoices:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_deductions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_deductions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_expenses WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_expenses:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_incomes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_incomes:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_subscriptions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_subscriptions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_payment_methods WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_payment_methods:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_settings WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_settings:' || SQLERRM); END;
    BEGIN DELETE FROM public.feature_usage_events WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('feature_usage_events:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_activity_logs WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_activity_logs:' || SQLERRM); END;
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;

    FOR ann IN SELECT id, banner_url FROM public.announcements WHERE created_by = rec.user_id LOOP
      BEGIN DELETE FROM public.announcements WHERE id = ann.id;
      EXCEPTION WHEN OTHERS THEN warn := warn || ('announcements:' || SQLERRM); END;
    END LOOP;

    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = 'Inactive user', brand_name = NULL, logo_url = NULL,
           avatar_url = NULL, tagline = NULL, phone = NULL, address = NULL,
           tax_id = NULL, bank_name = NULL, bank_account_name = NULL,
           bank_account_number = NULL, payment_qr_url = NULL, social_link = NULL,
           terms = NULL, onboarding_data = '{}'::jsonb,
           purged_at = now(), updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    BEGIN DELETE FROM auth.users WHERE id = rec.user_id; did_auth := true;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('auth_users:' || SQLERRM); did_auth := false;
    END;

    user_id := rec.user_id; warnings := warn; auth_deleted := did_auth;
    RETURN NEXT;
  END LOOP;
END;
$function$;

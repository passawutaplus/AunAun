DROP FUNCTION IF EXISTS public.purge_inactive_profile_data(integer);

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
  IF auth.role() NOT IN ('service_role') THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id
      FROM public.profiles p
     WHERE p.is_active = false
       AND p.purge_after IS NOT NULL
       AND p.purge_after <= now()
       AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];
    did_auth := false;

    BEGIN
      DELETE FROM storage.objects
       WHERE bucket_id IN ('portfolio-images','brand-logos','supplier-files','supplier-covers','chat-images','announcement-banners')
         AND (name = rec.user_id::text OR name LIKE rec.user_id::text || '/%');
    EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:user-prefix:' || SQLERRM); END;

    BEGIN
      DELETE FROM public.portfolio_comment_reports r
       WHERE r.reporter_user_id = rec.user_id
          OR r.comment_id IN (
            SELECT c.id FROM public.portfolio_comments c
            WHERE c.user_id = rec.user_id
               OR c.project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id)
          );
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comment_reports:' || SQLERRM); END;

    BEGIN DELETE FROM public.portfolio_likes WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_likes:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_comments WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comments:' || SQLERRM); END;
    BEGIN DELETE FROM public.hire_requests WHERE owner_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('hire_requests:' || SQLERRM); END;

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
      IF ann.banner_url IS NOT NULL THEN
        obj_path := regexp_replace(ann.banner_url, '^.*/storage/v1/object/public/announcement-banners/', '');
        IF obj_path <> ann.banner_url THEN
          BEGIN DELETE FROM storage.objects WHERE bucket_id = 'announcement-banners' AND name = obj_path;
          EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:ann-banner:' || SQLERRM); END;
        END IF;
      END IF;
      BEGIN DELETE FROM public.announcements WHERE id = ann.id;
      EXCEPTION WHEN OTHERS THEN warn := warn || ('announcements:' || SQLERRM); END;
    END LOOP;

    BEGIN DELETE FROM public.portfolio_projects WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_projects:' || SQLERRM); END;

    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = 'Inactive user',
           brand_name = NULL, logo_url = NULL, avatar_url = NULL, tagline = NULL,
           phone = NULL, address = NULL, tax_id = NULL,
           bank_name = NULL, bank_account_name = NULL, bank_account_number = NULL,
           payment_qr_url = NULL, social_link = NULL, terms = NULL,
           onboarding_data = '{}'::jsonb,
           purged_at = now(), updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    BEGIN
      DELETE FROM auth.users WHERE id = rec.user_id;
      did_auth := true;
    EXCEPTION WHEN OTHERS THEN
      warn := warn || ('auth_users:' || SQLERRM);
      did_auth := false;
    END;

    user_id := rec.user_id;
    warnings := warn;
    auth_deleted := did_auth;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.force_purge_user(_target_user_id uuid)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot purge yourself';
  END IF;

  UPDATE public.profiles
     SET is_active = false,
         tester_approved = false,
         deactivated_at = COALESCE(deactivated_at, now()),
         deactivated_by = auth.uid(),
         purge_after = now() - interval '1 second',
         updated_at = now()
   WHERE profiles.user_id = _target_user_id;

  RETURN QUERY SELECT * FROM public.purge_inactive_profile_data(1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.force_purge_user(uuid) FROM PUBLIC, anon, authenticated;
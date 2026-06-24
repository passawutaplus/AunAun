ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS purge_after timestamp with time zone,
  ADD COLUMN IF NOT EXISTS purged_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS profiles_inactive_purge_idx
  ON public.profiles (purge_after)
  WHERE is_active = false AND purge_after IS NOT NULL AND purged_at IS NULL;

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
RETURNS TABLE(user_id uuid, warnings text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $$
DECLARE
  rec RECORD;
  warn text[];
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

    BEGIN DELETE FROM storage.objects WHERE bucket_id IN ('portfolio-images','brand-logos','supplier-files','supplier-covers','chat-images') AND (name = rec.user_id::text OR name LIKE rec.user_id::text || '/%');
    EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:user-prefix:' || SQLERRM); END;

    BEGIN DELETE FROM public.portfolio_comment_reports WHERE reporter_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comment_reports:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_likes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_likes:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_comments WHERE user_id = rec.user_id;
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
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_projects WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_projects:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = COALESCE(display_name, 'Inactive user'),
           brand_name = NULL,
           logo_url = NULL,
           avatar_url = NULL,
           tagline = NULL,
           phone = NULL,
           address = NULL,
           tax_id = NULL,
           bank_name = NULL,
           bank_account_name = NULL,
           bank_account_number = NULL,
           payment_qr_url = NULL,
           social_link = NULL,
           terms = NULL,
           onboarding_data = '{}'::jsonb,
           purged_at = now(),
           updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    user_id := rec.user_id;
    warnings := warn;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) TO postgres, service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-inactive-users-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-inactive-users-daily');
EXCEPTION WHEN undefined_function OR undefined_table THEN
  NULL;
END $$;

SELECT cron.schedule(
  'purge-inactive-users-daily',
  '45 3 * * *',
  $$ SELECT public.purge_inactive_profile_data(50); $$
);
-- Platform events triggers for Ops Hub Activity feed
-- Apply via: cd Solo-Code && npx supabase db push

CREATE OR REPLACE FUNCTION public.trg_log_profile_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'user.signup',
    NEW.user_id,
    'profile',
    NEW.user_id::text,
    jsonb_build_object('username', NEW.username)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_profile_signup ON public.profiles;
CREATE TRIGGER platform_event_profile_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_profile_signup();

CREATE OR REPLACE FUNCTION public.trg_log_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'ticket.created',
    NEW.user_id,
    'support_ticket',
    NEW.id::text,
    jsonb_build_object('subject', NEW.subject)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_support_ticket ON public.support_tickets;
CREATE TRIGGER platform_event_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_support_ticket();

CREATE OR REPLACE FUNCTION public.trg_log_ecosystem_convert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
BEGIN
  meta := COALESCE(NEW.meta, '{}'::jsonb);
  IF (OLD.meta IS DISTINCT FROM NEW.meta)
     AND meta ? 'converted_at'
     AND NOT (COALESCE(OLD.meta, '{}'::jsonb) ? 'converted_at') THEN
    PERFORM public.log_platform_event(
      'ecosystem.handoff_completed',
      NULL,
      'ecosystem_link',
      NEW.id::text,
      jsonb_build_object('source_app', NEW.source_app, 'source_page', NEW.source_page)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_ecosystem_convert ON public.ecosystem_links;
CREATE TRIGGER platform_event_ecosystem_convert
  AFTER UPDATE ON public.ecosystem_links
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_ecosystem_convert();

CREATE OR REPLACE FUNCTION public.trg_log_cashout_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'cashout.request',
    NEW.user_id,
    'cashout_request',
    NEW.id::text,
    jsonb_build_object('amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_cashout ON shared.cashout_requests;
CREATE TRIGGER platform_event_cashout
  AFTER INSERT ON shared.cashout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_cashout_request();

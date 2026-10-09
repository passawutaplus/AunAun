
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS available_for_work boolean NOT NULL DEFAULT true;

ALTER TABLE public.studio_formation_requests
  ADD COLUMN IF NOT EXISTS proposed_logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_cover_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_expertise text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposed_contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_available_for_work boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proposed_website text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.complete_studio_formation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending int;
  v_declined int;
  v_request record;
  v_new_studio_id uuid;
  v_invitee uuid;
BEGIN
  SELECT * INTO v_request FROM public.studio_formation_requests WHERE id = NEW.formation_id;
  IF v_request.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*) FILTER (WHERE status = 'declined')
    INTO v_pending, v_declined
  FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id;

  IF v_declined > 0 THEN
    UPDATE public.studio_formation_requests SET status = 'cancelled', completed_at = now() WHERE id = NEW.formation_id;
    RETURN NEW;
  END IF;

  IF v_pending = 0 THEN
    INSERT INTO public.studios (
      slug, name, tagline, created_by, member_count,
      avatar_url, cover_url, bio, website,
      logo_url, expertise, contact_email, contact_phone, social_links, available_for_work
    )
    VALUES (
      v_request.proposed_slug, v_request.proposed_name, v_request.proposed_tagline, v_request.founder_id, 1,
      v_request.proposed_logo_url, v_request.proposed_cover_url, v_request.proposed_bio, v_request.proposed_website,
      v_request.proposed_logo_url, v_request.proposed_expertise, v_request.proposed_contact_email,
      v_request.proposed_contact_phone, v_request.proposed_social_links, v_request.proposed_available_for_work
    )
    RETURNING id INTO v_new_studio_id;

    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (v_new_studio_id, v_request.founder_id, 'owner');

    FOR v_invitee IN SELECT invitee_id FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id LOOP
      INSERT INTO public.studio_members (studio_id, user_id, role) VALUES (v_new_studio_id, v_invitee, 'member');
    END LOOP;

    UPDATE public.studios SET member_count = (SELECT COUNT(*) FROM public.studio_members WHERE studio_id = v_new_studio_id) WHERE id = v_new_studio_id;

    UPDATE public.studio_formation_requests SET status = 'completed', completed_at = now(), created_studio_id = v_new_studio_id WHERE id = NEW.formation_id;
  END IF;

  RETURN NEW;
END $function$;

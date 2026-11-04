-- Creator Invitation V1 — personalised invitations, private drafts, artist approval, publish + account.
--
-- Everything here is private: RLS is on with no policies for anon/authenticated, so the browser only
-- reaches this data through
--   * the `creator-invite` edge function (service role, token-gated, rate-limited) for invitees,
--   * the `creator-invite-admin` edge function + the admin_creator_invite_* RPCs below (has_role admin).
-- Tokens are 32 random bytes generated in the edge function; lookups use their sha256 (hex).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.creator_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  -- AES-GCM ciphertext of the token (key lives only in the edge runtime) so staff can copy the link
  -- for a DM and the mailer can build it; the database alone never reveals a usable token.
  token_cipher text NOT NULL,
  review_token_hash text UNIQUE,
  review_token_cipher text,
  review_expires_at timestamptz,
  review_sent_at timestamptz,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  discipline text,
  country text,
  contact_email text CHECK (contact_email IS NULL OR contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  social_handle text,
  language text NOT NULL DEFAULT 'th' CHECK (language IN ('th', 'en')),
  personal_note text CHECK (personal_note IS NULL OR char_length(personal_note) <= 600),
  interest_url text, -- internal only, never returned to the invitee
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'opened', 'started', 'submitted', 'preparing', 'needs_changes',
    'approved', 'published', 'declined', 'expired')),
  send_mode text NOT NULL DEFAULT 'email_now' CHECK (send_mode IN ('email_now', 'scheduled', 'manual_dm')),
  scheduled_at timestamptz,
  auto_reminder boolean NOT NULL DEFAULT true,
  reminder_sent_at timestamptz,
  sent_at timestamptz,
  sent_channel text,
  opened_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  submit_mode text CHECK (submit_mode IN ('full', 'quick')),
  approved_at timestamptz,
  change_request_note text,
  declined_at timestamptz,
  decline_note text,
  delete_after timestamptz,
  published_at timestamptz,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  self_signup_at timestamptz,
  account_created_at timestamptz,
  account_temp_expires_at timestamptz,
  unsubscribed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (contact_email IS NOT NULL OR social_handle IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS creator_invitations_status_idx ON anthem.creator_invitations (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS anthem.invite_submissions (
  invitation_id uuid PRIMARY KEY REFERENCES anthem.creator_invitations (id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 32768),
  staff_draft jsonb CHECK (staff_draft IS NULL OR (jsonb_typeof(staff_draft) = 'object' AND pg_column_size(staff_draft) <= 32768)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE TABLE IF NOT EXISTS anthem.invite_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES anthem.creator_invitations (id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('avatar', 'cover', 'p1', 'p2', 'p3')),
  storage_path text NOT NULL UNIQUE,
  mime text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  position integer NOT NULL DEFAULT 0,
  scan_status text NOT NULL DEFAULT 'pending_upload'
    CHECK (scan_status IN ('pending_upload', 'scanning', 'clean', 'blocked')),
  scan_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_media_invitation_idx ON anthem.invite_media (invitation_id, slot, position);

CREATE TABLE IF NOT EXISTS anthem.invite_consents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES anthem.creator_invitations (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('draft_permission', 'image_rights', 'publish_approval')),
  scope text, -- e.g. project slot for image_rights
  text_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS invite_consents_invitation_idx ON anthem.invite_consents (invitation_id, granted_at);

CREATE TABLE IF NOT EXISTS anthem.invite_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES anthem.creator_invitations (id) ON DELETE CASCADE,
  kind text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('admin', 'artist', 'system')),
  actor_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_events_invitation_idx ON anthem.invite_events (invitation_id, created_at DESC);

-- Automatic emails (invitation, one reminder, submission received, review link). The account-ready
-- email carries the one-time password, so it is sent directly by the edge function and never queued.
CREATE TABLE IF NOT EXISTS anthem.invite_email_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES anthem.creator_invitations (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('invite', 'reminder', 'received', 'review')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  not_before timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS invite_email_outbox_due_idx ON anthem.invite_email_outbox (status, not_before);

CREATE TABLE IF NOT EXISTS anthem.invite_rate_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE anthem.creator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.invite_rate_hits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON anthem.creator_invitations, anthem.invite_submissions, anthem.invite_media, anthem.invite_consents,
  anthem.invite_events, anthem.invite_email_outbox, anthem.invite_rate_hits FROM PUBLIC, anon, authenticated;
GRANT ALL ON anthem.creator_invitations, anthem.invite_submissions, anthem.invite_media, anthem.invite_consents,
  anthem.invite_events, anthem.invite_email_outbox, anthem.invite_rate_hits TO service_role;

-- Admins may read directly too (detail screens use the RPCs, this keeps ad-hoc admin queries working).
DROP POLICY IF EXISTS creator_invitations_admin_read ON anthem.creator_invitations;
CREATE POLICY creator_invitations_admin_read ON anthem.creator_invitations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION anthem.creator_invitations_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = anthem AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_creator_invitations_touch ON anthem.creator_invitations;
CREATE TRIGGER trg_creator_invitations_touch BEFORE UPDATE ON anthem.creator_invitations
  FOR EACH ROW EXECUTE FUNCTION anthem.creator_invitations_touch();

-- ---------------------------------------------------------------------------
-- Private storage bucket for invitee uploads (signed upload URLs only; no storage policies)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('creator-invite-media', 'creator-invite-media', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window) for the public edge function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anthem.invite_rate_hit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
DECLARE
  w timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  n integer;
BEGIN
  INSERT INTO anthem.invite_rate_hits AS r (key, window_start, hits) VALUES (_key, w, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO n;
  RETURN n <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION anthem.invite_rate_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem.invite_rate_hit(text, integer, integer) TO service_role;

-- Public wrapper so the edge function can call it through PostgREST (public schema is exposed).
CREATE OR REPLACE FUNCTION public.creator_invite_rate_hit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = anthem AS $$
  SELECT anthem.invite_rate_hit(_key, _limit, _window_seconds);
$$;
REVOKE ALL ON FUNCTION public.creator_invite_rate_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_invite_rate_hit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- "I'll create my profile": link a signed-in account to the invitation (no profile is created)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_invite_link_signup(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv anthem.creator_invitations%ROWTYPE;
BEGIN
  IF uid IS NULL OR _token IS NULL OR char_length(_token) < 40 OR char_length(_token) > 64 THEN
    RETURN false;
  END IF;
  SELECT * INTO inv FROM anthem.creator_invitations
   WHERE token_hash = encode(extensions.digest(_token, 'sha256'), 'hex');
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.expires_at < now()
     OR inv.status IN ('published', 'declined', 'expired') THEN
    RETURN false;
  END IF;
  IF inv.user_id IS NOT NULL AND inv.user_id <> uid THEN
    RETURN false;
  END IF;
  UPDATE anthem.creator_invitations
     SET user_id = uid,
         self_signup_at = coalesce(self_signup_at, now()),
         started_at = coalesce(started_at, now()),
         status = CASE WHEN status IN ('draft', 'sent', 'opened') THEN 'started' ELSE status END
   WHERE id = inv.id;
  IF inv.self_signup_at IS NULL THEN
    INSERT INTO anthem.invite_events (invitation_id, kind, actor_type, actor_id, detail)
    VALUES (inv.id, 'self_signup_linked', 'artist', uid, '{}'::jsonb);
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.creator_invite_link_signup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_invite_link_signup(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin read RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_creator_invites_list()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', i.id,
      'display_name', i.display_name,
      'discipline', i.discipline,
      'country', i.country,
      'contact_email', i.contact_email,
      'social_handle', i.social_handle,
      'language', i.language,
      'send_mode', i.send_mode,
      'status', CASE WHEN i.status IN ('draft', 'sent', 'opened', 'started') AND (i.expires_at < now() OR i.revoked_at IS NOT NULL)
                     THEN 'expired' ELSE i.status END,
      'revoked', i.revoked_at IS NOT NULL,
      'unsubscribed', i.unsubscribed_at IS NOT NULL,
      'review_sent_at', i.review_sent_at,
      'sent_at', i.sent_at,
      'submitted_at', i.submitted_at,
      'expires_at', i.expires_at,
      'created_at', i.created_at,
      'updated_at', i.updated_at
    ) ORDER BY i.updated_at DESC)
    FROM anthem.creator_invitations i
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_creator_invites_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_creator_invites_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_creator_invite_detail(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  inv anthem.creator_invitations%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inv FROM anthem.creator_invitations WHERE id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'invitation', to_jsonb(inv) - 'token_hash' - 'review_token_hash' - 'token_cipher' - 'review_token_cipher',
    'submission', (SELECT jsonb_build_object('data', s.data, 'staff_draft', s.staff_draft, 'updated_at', s.updated_at, 'submitted_at', s.submitted_at)
                     FROM anthem.invite_submissions s WHERE s.invitation_id = _id),
    'media', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'slot', m.slot, 'mime', m.mime, 'size_bytes', m.size_bytes,
                                       'position', m.position, 'scan_status', m.scan_status, 'scan_note', m.scan_note, 'created_at', m.created_at)
                                       ORDER BY m.slot, m.position)
                         FROM anthem.invite_media m WHERE m.invitation_id = _id AND m.scan_status <> 'pending_upload'), '[]'::jsonb),
    'consents', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', c.kind, 'scope', c.scope, 'text_version', c.text_version, 'granted_at', c.granted_at)
                                          ORDER BY c.granted_at)
                            FROM anthem.invite_consents c WHERE c.invitation_id = _id), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', e.kind, 'actor_type', e.actor_type, 'actor', p.display_name,
                                        'detail', e.detail, 'created_at', e.created_at) ORDER BY e.created_at DESC)
                          FROM anthem.invite_events e LEFT JOIN public.profiles p ON p.user_id = e.actor_id
                         WHERE e.invitation_id = _id), '[]'::jsonb),
    'emails', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', o.kind, 'status', o.status, 'not_before', o.not_before,
                                        'sent_at', o.sent_at, 'attempts', o.attempts, 'last_error', o.last_error) ORDER BY o.created_at DESC)
                          FROM anthem.invite_email_outbox o WHERE o.invitation_id = _id), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_creator_invite_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_creator_invite_detail(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- LINE admin alert when an artist submits (keeps every kind added before, incl. 'trend')
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_kind_check;
ALTER TABLE public.admin_line_outbox ADD CONSTRAINT admin_line_outbox_kind_check
  CHECK (kind = ANY (ARRAY['member', 'feedback', 'report', 'digest', 'event', 'trend', 'creator_invite']));

CREATE OR REPLACE FUNCTION public.admin_line_creator_invite_info(_id uuid)
RETURNS TABLE (display_name text, discipline text, country text, submit_mode text, submitted_at timestamptz, project_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT i.display_name, i.discipline, i.country, i.submit_mode, i.submitted_at,
         coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(s.data -> 'projects') = 'array' THEN s.data -> 'projects' END), 0)
    FROM anthem.creator_invitations i
    LEFT JOIN anthem.invite_submissions s ON s.invitation_id = i.id
   WHERE i.id = _id;
$$;
REVOKE ALL ON FUNCTION public.admin_line_creator_invite_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_creator_invite_info(uuid) TO service_role;

CREATE OR REPLACE FUNCTION anthem.admin_line_on_creator_invite_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    PERFORM public.admin_line_enqueue('creator_invite', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block the artist's submit
END;
$$;
DROP TRIGGER IF EXISTS trg_admin_line_creator_invite ON anthem.creator_invitations;
CREATE TRIGGER trg_admin_line_creator_invite
  AFTER UPDATE OF status ON anthem.creator_invitations
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_creator_invite_submit();

-- ---------------------------------------------------------------------------
-- Cron: every 10 minutes wake the mail/sweep function (scheduled sends, the 5-day reminder,
-- expiry, one-time password expiry, 30-day purge of declined invitations).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anthem.creator_invite_wake()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/creator-invite-mail',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE ALL ON FUNCTION anthem.creator_invite_wake() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('creator-invite-sweep');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
SELECT cron.schedule('creator-invite-sweep', '*/10 * * * *', 'select anthem.creator_invite_wake()');

-- Sponsor & Collaborate inquiries from /support/partners.
-- Signed-out visitors can send (brands are not members), so the write goes through one
-- SECURITY DEFINER function with its own limits. Nobody but admins can read the table.
-- The owner applies this by hand. Until then the form shows its "could not send, message us on LINE" state.

CREATE TABLE IF NOT EXISTS anthem.sponsor_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  company text NOT NULL,
  contact text NOT NULL,
  email text NOT NULL,
  line_id text NOT NULL DEFAULT '',
  interest text NOT NULL CHECK (interest IN ('platform', 'first_connect', 'in_kind', 'invite_us', 'event', 'unsure')),
  budget text NOT NULL CHECK (budget IN ('undecided', 'under_5k', '5k_10k', '10k_30k', 'over_30k', 'in_kind')),
  message text NOT NULL DEFAULT '',
  -- Set when the sender happened to be signed in.
  user_id uuid,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsor_inquiries_created_idx ON anthem.sponsor_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS sponsor_inquiries_email_idx ON anthem.sponsor_inquiries (email, created_at DESC);

ALTER TABLE anthem.sponsor_inquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON anthem.sponsor_inquiries FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON anthem.sponsor_inquiries TO authenticated;
GRANT ALL ON anthem.sponsor_inquiries TO service_role;

DROP POLICY IF EXISTS sponsor_inquiries_admin_read ON anthem.sponsor_inquiries;
CREATE POLICY sponsor_inquiries_admin_read ON anthem.sponsor_inquiries
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS sponsor_inquiries_admin_update ON anthem.sponsor_inquiries;
CREATE POLICY sponsor_inquiries_admin_update ON anthem.sponsor_inquiries
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION anthem.submit_sponsor_inquiry(
  _company text,
  _contact text,
  _email text,
  _line_id text,
  _interest text,
  _budget text,
  _message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $function$
DECLARE
  v_company text := left(btrim(COALESCE(_company, '')), 120);
  v_contact text := left(btrim(COALESCE(_contact, '')), 100);
  v_email text := lower(btrim(COALESCE(_email, '')));
  v_line text := left(btrim(COALESCE(_line_id, '')), 60);
  v_interest text := COALESCE(_interest, '');
  v_budget text := COALESCE(_budget, '');
  v_message text := left(btrim(COALESCE(_message, '')), 1000);
  v_ref text;
BEGIN
  IF v_company = '' OR v_contact = '' THEN
    RAISE EXCEPTION 'INVALID: company and contact are required';
  END IF;
  IF length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' THEN
    RAISE EXCEPTION 'INVALID: email';
  END IF;
  IF v_interest NOT IN ('platform', 'first_connect', 'in_kind', 'invite_us', 'event', 'unsure') THEN
    v_interest := 'unsure';
  END IF;
  IF v_budget NOT IN ('undecided', 'under_5k', '5k_10k', '10k_30k', 'over_30k', 'in_kind') THEN
    v_budget := 'undecided';
  END IF;

  -- No login here, so the limits are per email address and for the whole form.
  IF (SELECT count(*) FROM anthem.sponsor_inquiries
      WHERE email = v_email AND created_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many messages from this email today';
  END IF;
  IF (SELECT count(*) FROM anthem.sponsor_inquiries
      WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many messages right now';
  END IF;

  v_ref := 'SP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO anthem.sponsor_inquiries (ref, company, contact, email, line_id, interest, budget, message, user_id)
  VALUES (v_ref, v_company, v_contact, v_email, v_line, v_interest, v_budget, v_message, auth.uid());

  RETURN v_ref;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.submit_sponsor_inquiry(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.submit_sponsor_inquiry(text, text, text, text, text, text, text) TO anon, authenticated;

-- SAMECOR account deletion (needs 20261102120000_aplus1_legal_compliance.sql).
-- Owner decisions, 2026-11-02:
-- * an admin approves each delete request; the profile and works are hidden at once
-- * 30 days later the account is purged, unless the user cancels first
-- * chat messages stay, with the sender shown as a deleted user; files they sent are removed
-- * money, order and tax records stay for legal retention; KYC files and rows are removed
-- Auth users are shared with So1o and Vault, so the auth account is only deleted when the person
-- has no data in those apps; otherwise the request waits for an admin with a note.

ALTER TABLE anthem.privacy_requests
  ADD COLUMN IF NOT EXISTS scheduled_purge_at timestamptz,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_project_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE anthem.privacy_requests DROP CONSTRAINT IF EXISTS privacy_requests_status_check;
ALTER TABLE anthem.privacy_requests ADD CONSTRAINT privacy_requests_status_check
  CHECK (status IN ('new', 'reviewing', 'approved', 'rejected', 'completed', 'cancelled'));

-- ── Admin approves: hide now, purge in 30 days ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_account_deletion(_request_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  req anthem.privacy_requests;
  purge_at timestamptz := now() + interval '30 days';
  hidden uuid[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT * INTO req FROM anthem.privacy_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR req.request_type <> 'delete' THEN
    RAISE EXCEPTION 'ไม่พบคำขอลบบัญชี';
  END IF;
  IF req.status NOT IN ('new', 'reviewing') THEN
    RAISE EXCEPTION 'คำขอนี้ดำเนินการไปแล้ว';
  END IF;
  IF public.has_role(req.user_id, 'admin') THEN
    RAISE EXCEPTION 'ลบบัญชีแอดมินจากหน้านี้ไม่ได้';
  END IF;

  WITH changed AS (
    UPDATE anthem.projects SET status = 'Private'
    WHERE owner_id = req.user_id AND status = 'Published'
    RETURNING id
  )
  SELECT coalesce(array_agg(id), '{}') INTO hidden FROM changed;

  UPDATE anthem.privacy_requests
     SET status = 'approved', scheduled_purge_at = purge_at, hidden_project_ids = hidden
   WHERE id = _request_id;

  UPDATE public.profiles
     SET account_status = 'deactivated',
         is_active = false,
         deactivated_at = now(),
         deactivated_by = auth.uid(),
         purge_after = purge_at,
         updated_at = now()
   WHERE user_id = req.user_id;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'account_deletion_approved', 'user', req.user_id::text,
          jsonb_build_object('request_id', _request_id, 'purge_at', purge_at, 'hidden_projects', cardinality(hidden)));

  RETURN purge_at;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_account_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_account_deletion(uuid) TO authenticated;

-- ── User cancels (called by the account-deletion-cancel function) ─────────────
-- Service role only: restoring account_status is blocked for users by profiles_block_sensitive_update.
CREATE OR REPLACE FUNCTION public.account_cancel_deletion(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  req anthem.privacy_requests;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role only';
  END IF;

  SELECT * INTO req FROM anthem.privacy_requests
   WHERE user_id = _user_id AND request_type = 'delete'
     AND status IN ('new', 'reviewing', 'approved') AND purged_at IS NULL
   ORDER BY requested_at DESC
   LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE anthem.privacy_requests SET status = 'cancelled', completed_at = now() WHERE id = req.id;

  IF req.status = 'approved' THEN
    UPDATE anthem.projects SET status = 'Published'
     WHERE id = ANY (req.hidden_project_ids) AND owner_id = _user_id AND status = 'Private';
    UPDATE public.profiles
       SET account_status = 'active',
           is_active = true,
           deactivated_at = NULL,
           deactivated_by = NULL,
           purge_after = NULL,
           updated_at = now()
     WHERE user_id = _user_id;
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (_user_id, 'account_deletion_cancelled', 'user', _user_id::text, jsonb_build_object('request_id', req.id));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.account_cancel_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_cancel_deletion(uuid) TO service_role;

-- ── Purge helpers (called by the account-purge function) ──────────────────────
-- Data in So1o / Vault that would be lost if the shared auth account were deleted.
CREATE OR REPLACE FUNCTION public.account_purge_blockers(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found text[] := '{}';
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role only';
  END IF;
  IF EXISTS (SELECT 1 FROM public.quotations WHERE user_id = _user_id) THEN found := found || 'so1o:quotations'; END IF;
  IF EXISTS (SELECT 1 FROM public.finance_incomes WHERE user_id = _user_id) THEN found := found || 'so1o:finance'; END IF;
  IF EXISTS (SELECT 1 FROM public.saved_clients WHERE user_id = _user_id) THEN found := found || 'so1o:clients'; END IF;
  IF EXISTS (SELECT 1 FROM public.dashboard_jobs WHERE user_id = _user_id) THEN found := found || 'so1o:jobs'; END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id) THEN found := found || 'so1o:subscription'; END IF;
  IF EXISTS (SELECT 1 FROM public.vault_items WHERE user_id = _user_id) THEN found := found || 'vault:items'; END IF;
  IF EXISTS (SELECT 1 FROM public.vault_collections WHERE user_id = _user_id) THEN found := found || 'vault:collections'; END IF;
  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.account_purge_blockers(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_purge_blockers(uuid) TO service_role;

-- Files to remove: everything the person uploaded, plus their legacy folders. Tax certificates stay.
CREATE OR REPLACE FUNCTION public.account_storage_objects(_user_id uuid)
RETURNS TABLE (bucket_id text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = storage, public
AS $$
  SELECT o.bucket_id, o.name
    FROM storage.objects o
   WHERE coalesce(auth.role(), '') = 'service_role'
     AND o.bucket_id <> 'wht-certificates'
     AND (
       o.owner_id = _user_id::text
       OR o.owner = _user_id
       OR (o.bucket_id = 'project-media' AND o.name LIKE 'anthem/' || _user_id::text || '/%')
       OR (o.bucket_id = 'project-media' AND o.name LIKE 'anthem/kyc/' || _user_id::text || '/%')
       OR (o.bucket_id IN ('project-assets', 'kyc-documents') AND o.name LIKE _user_id::text || '/%')
     );
$$;

REVOKE ALL ON FUNCTION public.account_storage_objects(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_storage_objects(uuid) TO service_role;

-- Removes SAMECOR personal data and leaves an anonymous profile so old chats still render.
CREATE OR REPLACE FUNCTION public.account_purge_user_data(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  req anthem.privacy_requests;
  uid uuid;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role only';
  END IF;

  SELECT * INTO req FROM anthem.privacy_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR req.request_type <> 'delete' OR req.status <> 'approved'
     OR req.scheduled_purge_at IS NULL OR req.scheduled_purge_at > now() THEN
    RAISE EXCEPTION 'คำขอนี้ยังไม่ถึงกำหนดลบ';
  END IF;
  uid := req.user_id;

  IF req.purged_at IS NULL THEN
    -- Works and everything hanging off them (comments, likes, views on them cascade from anthem.projects).
    DELETE FROM anthem.projects WHERE owner_id = uid;
    DELETE FROM anthem.project_comments WHERE user_id = uid;
    DELETE FROM anthem.project_likes WHERE user_id = uid;
    DELETE FROM anthem.project_views WHERE user_id = uid;
    DELETE FROM anthem.project_bookmarks WHERE user_id = uid;
    DELETE FROM anthem.collections WHERE owner_id = uid;
    DELETE FROM anthem.inspire_boards WHERE owner_id = uid;
    DELETE FROM anthem.follows WHERE follower_id = uid OR following_id = uid;
    DELETE FROM anthem.user_blocks WHERE blocker_id = uid OR blocked_id = uid;
    DELETE FROM anthem.image_likes WHERE user_id = uid;
    DELETE FROM anthem.image_shares WHERE user_id = uid;
    DELETE FROM anthem.community_post_comments WHERE user_id = uid;
    DELETE FROM anthem.community_post_likes WHERE user_id = uid;
    DELETE FROM anthem.community_post_bookmarks WHERE user_id = uid;
    DELETE FROM anthem.community_post_views WHERE user_id = uid;
    DELETE FROM anthem.community_posts WHERE author_id = uid;
    DELETE FROM anthem.post_boosts WHERE user_id = uid;
    DELETE FROM anthem.app_feedback WHERE user_id = uid;
    DELETE FROM anthem.churn_email_log WHERE user_id = uid;

    -- Chats stay for the other side; files the person sent are removed with their storage objects.
    UPDATE shared.messages SET attachment_url = NULL WHERE sender_id = uid AND attachment_url IS NOT NULL;
    DELETE FROM shared.conversation_hides WHERE user_id = uid;
    DELETE FROM shared.conversation_pins WHERE user_id = uid;
    DELETE FROM shared.notifications WHERE user_id = uid;
    DELETE FROM shared.kyc_documents WHERE user_id = uid;
    DELETE FROM shared.kyc_requests WHERE user_id = uid;
    DELETE FROM shared.referral_codes WHERE user_id = uid;
    DELETE FROM shared.user_display_currency WHERE user_id = uid;

    UPDATE public.profiles
       SET account_status = 'deleted',
           display_name = 'ผู้ใช้ที่ลบบัญชี',
           email = NULL, username = NULL, brand_name = NULL, logo_url = NULL, avatar_url = NULL,
           tagline = NULL, phone = NULL, address = NULL, tax_id = NULL,
           bank_name = NULL, bank_account_name = NULL, bank_account_number = NULL, payment_qr_url = NULL,
           social_link = NULL, terms = NULL, onboarding_data = '{}'::jsonb, bio = NULL, role = NULL,
           website = NULL, line_id = NULL, facebook = NULL, instagram = NULL, skills = NULL,
           experience = NULL, location = NULL, cover_url = NULL, cover_original_url = NULL,
           cv_photo_url = NULL, cv = DEFAULT, signature_url = NULL, legal_name = NULL,
           company_name = NULL, billing_address = NULL, branch = NULL, contact_person = NULL,
           contact_role = NULL, date_of_birth = NULL, social_links = DEFAULT, profile_address = DEFAULT,
           profile_faq = NULL, opportunity_note = NULL, project_rate_note = NULL,
           line_messaging_user_id = NULL, line_notify_enabled = false, line_notify_prefs = NULL,
           stripe_connect_account_id = NULL, feed_interests = NULL, public_visibility = NULL,
           ui_prefs = NULL, onboarding_visits = NULL, open_for_work = false,
           purged_at = now(), updated_at = now()
     WHERE user_id = uid;

    UPDATE anthem.privacy_requests SET purged_at = now() WHERE id = _request_id;
  END IF;

  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.account_purge_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_purge_user_data(uuid) TO service_role;

-- Daily wake-up. account-purge only acts on approved requests that are due, so the call needs no secret
-- (same pattern as admin_line_wake → line-admin-notify).
CREATE OR REPLACE FUNCTION public.account_purge_wake()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/account-purge',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.account_purge_wake() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('samecor-account-purge', '15 3 * * *', $$ select public.account_purge_wake() $$);

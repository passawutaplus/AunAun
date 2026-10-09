-- ======================================================================
-- apply-all.sql  (generated 2026-10-09)  files 01..07 in order, all idempotent
-- Tested on a local Postgres (92 assertions). NOT yet applied to production.
-- 20261009080000 (close_public_rpc_holes) was already applied by hand on 2026-10-09.
-- ======================================================================

-- ---------------------------------------------------------------- 01_lock_scan_status_and_counters.sql
-- Review fixes (2026-10-07)
-- 1) forum_attachments: authors could UPDATE their own row, including scan_status,
--    and mark an unscanned/blocked file as 'clean' (bypassing the virus-scan gate).
-- 2) projects: owners could UPDATE views / likes directly (counter inflation).
-- Only service_role (scanner / server jobs) and admins may change these columns.

CREATE OR REPLACE FUNCTION anthem.guard_forum_attachment_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.scan_status IS DISTINCT FROM OLD.scan_status
     OR NEW.scan_reason IS DISTINCT FROM OLD.scan_reason
     OR NEW.scanned_at IS DISTINCT FROM OLD.scanned_at
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.public_url IS DISTINCT FROM OLD.public_url
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type THEN
    RAISE EXCEPTION 'forum_attachments: scan / file fields are server-managed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_forum_attachment_scan ON anthem.forum_attachments;
CREATE TRIGGER trg_guard_forum_attachment_scan
  BEFORE UPDATE ON anthem.forum_attachments
  FOR EACH ROW EXECUTE FUNCTION anthem.guard_forum_attachment_scan();

-- New rows always start as pending, whatever the client sends.
CREATE OR REPLACE FUNCTION anthem.force_forum_attachment_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, anthem
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.scan_status := 'pending';
    NEW.scan_reason := NULL;
    NEW.scanned_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_forum_attachment_pending ON anthem.forum_attachments;
CREATE TRIGGER trg_force_forum_attachment_pending
  BEFORE INSERT ON anthem.forum_attachments
  FOR EACH ROW EXECUTE FUNCTION anthem.force_forum_attachment_pending();

-- Project counters are maintained by server-side functions only.
-- SECURITY INVOKER on purpose: current_user must be the caller's role
-- ('authenticated' for direct REST writes, the owner inside SECURITY DEFINER counter RPCs).
CREATE OR REPLACE FUNCTION anthem.guard_project_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, anthem
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- Counter RPCs run as SECURITY DEFINER (owner = postgres), so allow those too.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.views := OLD.views;
  NEW.likes := OLD.likes;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_counters ON anthem.projects;
CREATE TRIGGER trg_guard_project_counters
  BEFORE UPDATE ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION anthem.guard_project_counters();

-- ---------------------------------------------------------------- 02_hire_order_server_money.sql
-- Review fix (2026-10-07): hire order money is computed by the database, not the browser.
-- Before: on INSERT the guard only overwrote job_price_satang from the quote; buyer_pays_satang,
-- wht_satang, seller_net_satang, fees and balance came from the client. /api/hire-charge charges
-- buyer_pays_satang, so a buyer could insert a cheaper order.
-- Mirrors Anthem-Code/src/lib/payments/fees.ts: platform fee % and version come from the active row of
-- shared.aplus1_fee_configs (10% / aplus1-v1 today; falls back to 10% if no row is active),
-- PromptPay buyer pays (job − WHT) × deposit%, card surcharge stored as 0 (added at charge time). WHT clamped to ≤ 5%.

CREATE OR REPLACE FUNCTION shared.enforce_hire_order_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  q_amount bigint;
  v_job bigint;
  v_wht bigint;
  v_dep numeric;
  v_after_wht bigint;
  v_fee bigint;
  v_pays bigint;
  v_fee_pct numeric;
  v_fee_ver text;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
     OR current_setting('aplus1.allow_hire_paid', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'awaiting_payment') THEN
      RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_STATUS';
    END IF;
    NEW.paid_at := NULL;
    NEW.amount_paid_satang := 0;

    IF NEW.quote_id IS NOT NULL THEN
      SELECT amount_satang INTO q_amount FROM shared.hire_quotes WHERE id = NEW.quote_id;
      IF q_amount IS NOT NULL AND q_amount > 0 THEN
        NEW.job_price_satang := q_amount;
      END IF;
    END IF;

    v_job := greatest(coalesce(NEW.job_price_satang, 0), 0);
    v_wht := least(greatest(coalesce(NEW.wht_satang, 0), 0), round(v_job * 0.05)::bigint);
    v_dep := least(greatest(round(coalesce(NEW.deposit_percent, 100)), 1), 100);
    v_after_wht := v_job - v_wht;
    SELECT c.platform_fee_percent, c.version INTO v_fee_pct, v_fee_ver
      FROM shared.aplus1_fee_configs c
     WHERE c.effective_from <= now() AND (c.effective_to IS NULL OR c.effective_to > now())
     ORDER BY c.effective_from DESC
     LIMIT 1;
    v_fee_pct := least(greatest(coalesce(v_fee_pct, 10), 0), 100);
    v_fee := round(v_job * v_fee_pct / 100)::bigint;
    v_pays := round(v_after_wht * v_dep / 100)::bigint;

    NEW.wht_satang := v_wht;
    NEW.deposit_percent := v_dep;
    NEW.platform_fee_percent := v_fee_pct;
    NEW.fee_version := coalesce(v_fee_ver, NEW.fee_version);
    NEW.platform_fee_satang := v_fee;
    NEW.card_surcharge_satang := 0;
    NEW.buyer_pays_satang := v_pays;
    NEW.seller_net_satang := v_job - v_fee - v_wht;
    NEW.balance_due_satang := CASE WHEN v_dep < 100 THEN v_after_wht - v_pays ELSE 0 END;
    RETURN NEW;
  END IF;

  IF NEW.job_price_satang IS DISTINCT FROM OLD.job_price_satang
     OR NEW.buyer_pays_satang IS DISTINCT FROM OLD.buyer_pays_satang
     OR NEW.seller_net_satang IS DISTINCT FROM OLD.seller_net_satang
     OR NEW.platform_fee_satang IS DISTINCT FROM OLD.platform_fee_satang
     OR NEW.card_surcharge_satang IS DISTINCT FROM OLD.card_surcharge_satang
     OR NEW.amount_paid_satang IS DISTINCT FROM OLD.amount_paid_satang
     OR NEW.balance_due_satang IS DISTINCT FROM OLD.balance_due_satang
     OR NEW.wht_satang IS DISTINCT FROM OLD.wht_satang
     OR NEW.deposit_percent IS DISTINCT FROM OLD.deposit_percent
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
  THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_MONEY';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('paid_pending', 'deposit_paid')
     AND OLD.status NOT IN ('paid_pending', 'deposit_paid') THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_PAID_STATUS';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- 03_restore_user_reports.sql
-- Review fix (2026-10-07): restore anthem.user_reports.
-- public.create_report() (the "report this content" button, forum + community + projects)
-- inserts into anthem.user_reports, but that table does not exist in the unified database:
-- it was only ever defined in the old Anthem-Code/supabase/migrations folder (public schema),
-- which is not applied to this project. Every report currently fails.
-- Columns = original definition + evidence_files + the ai_* triage fields create_report writes.

CREATE TABLE IF NOT EXISTS anthem.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN (
    'user', 'project', 'comment', 'studio', 'message', 'job',
    'community_post', 'community_comment', 'forum_topic', 'forum_reply', 'work_review'
  )),
  target_id uuid NOT NULL,
  target_owner_id uuid,
  reason text NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'nsfw', 'copyright', 'scam', 'impersonation', 'other', 'job_spam'
  )),
  details text NOT NULL DEFAULT '',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_at timestamptz,
  ai_priority integer,
  ai_summary text,
  ai_recommendation text,
  ai_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Writes go through create_report() (SECURITY DEFINER, rate-limited); clients only read.
REVOKE ALL ON anthem.user_reports FROM anon, authenticated;
GRANT SELECT ON anthem.user_reports TO authenticated;
GRANT UPDATE (status, admin_note, resolved_by, resolved_at) ON anthem.user_reports TO authenticated;
GRANT DELETE ON anthem.user_reports TO authenticated;
GRANT ALL ON anthem.user_reports TO service_role;

ALTER TABLE anthem.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_reports_select ON anthem.user_reports;
CREATE POLICY user_reports_select ON anthem.user_reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_reports_admin_update ON anthem.user_reports;
CREATE POLICY user_reports_admin_update ON anthem.user_reports
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_reports_admin_delete ON anthem.user_reports;
CREATE POLICY user_reports_admin_delete ON anthem.user_reports
  FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_user_reports_status_created ON anthem.user_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_target ON anthem.user_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON anthem.user_reports (reporter_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_report_per_reporter_target
  ON anthem.user_reports (reporter_id, target_type, target_id) WHERE status IN ('open', 'reviewing');

CREATE OR REPLACE FUNCTION anthem.touch_user_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_reports_updated_at ON anthem.user_reports;
CREATE TRIGGER trg_user_reports_updated_at
  BEFORE UPDATE ON anthem.user_reports
  FOR EACH ROW EXECUTE FUNCTION anthem.touch_user_reports_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE anthem.user_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------- 04_unsend_message.sql
-- Review fix (2026-10-07): public.unsend_message did not exist, so "ยกเลิกข้อความ" in chat always failed.
-- Soft-deletes the caller's own non-system message within 24 h (matches UNSEND_WINDOW_MS in useChat.ts).

CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE shared.messages
     SET deleted_at = now()
   WHERE id = p_message_id
     AND sender_id = v_uid
     AND deleted_at IS NULL
     AND coalesce(message_type, 'text') <> 'system'
     AND created_at > now() - interval '24 hours';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'UNSEND_NOT_ALLOWED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.unsend_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unsend_message(uuid) TO authenticated;

-- ---------------------------------------------------------------- 05_messages_lock_update.sql
-- Review fix (2026-10-09): shared.messages UPDATE was far too open.
-- 1) Policy "Participants can update messages" let ANY participant of a conversation UPDATE ANY message in it
--    (content, sender_id, ...), i.e. rewrite or re-attribute the other person's messages through REST.
--    The app never edits messages directly: read receipts go through mark_conversation_read() and
--    unsending through unsend_message(), both SECURITY DEFINER, so they are unaffected.
-- 2) `authenticated` had table-wide UPDATE, so even the sender-only policy allowed moving one's own
--    message to another conversation (conversation_id) or changing created_at.
--    Table-level UPDATE is revoked; only the columns a client may legitimately change are granted back.

DROP POLICY IF EXISTS "Participants can update messages" ON shared.messages;

DROP POLICY IF EXISTS "Admins can update messages" ON shared.messages;
CREATE POLICY "Admins can update messages" ON shared.messages
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE UPDATE ON shared.messages FROM authenticated;
GRANT UPDATE (content, attachment_url, deleted_at) ON shared.messages TO authenticated;

-- ---------------------------------------------------------------- 06_admin_helpers_and_grants.sql
-- Review fix (2026-10-09): back-office (admin) helpers and grants.
--
-- 1) Nine anthem.admin_* functions call public._admin_actor() / public._admin_audit(), but the helpers only exist in
--    schema `anthem`. Every call fails with "function public._admin_actor() does not exist", so these admin actions have
--    been dead (they fail closed): admin_set_user_role, admin_reject_cashout, admin_mark_cashout_paid, admin_update_gift,
--    admin_update_gift_limits, admin_dismiss_notification, admin_delete_project/comment/collection (anthem variants).
--    The app routes the first six to schema `anthem` (tableRouting.ts). Fix: thin public wrappers around the anthem helpers.
--    The wrappers are not callable by clients; the admin_* functions are SECURITY DEFINER, so they call them as the owner.
-- 2) anthem._admin_audit() was executable by every signed-in user, so anyone could write rows into the admin audit log.
--    It is only ever called from SECURITY DEFINER functions, so client EXECUTE is revoked.
-- 3) public.admin_* RPCs were executable by `anon` (they refuse non-admins at runtime). Closed anyway: admin RPCs are
--    for signed-in users only.

CREATE OR REPLACE FUNCTION public._admin_actor()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT anthem._admin_actor();
$$;

CREATE OR REPLACE FUNCTION public._admin_audit(
  _action text,
  _target_type text,
  _target_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT anthem._admin_audit(_action, _target_type, _target_id, _metadata);
$$;

REVOKE ALL ON FUNCTION public._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._admin_actor() TO service_role;
GRANT EXECUTE ON FUNCTION public._admin_audit(text, text, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION anthem._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem._admin_actor() TO service_role;
GRANT EXECUTE ON FUNCTION anthem._admin_audit(text, text, uuid, jsonb) TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'anthem')
      AND p.proname LIKE 'admin\_%'
      AND p.prokind = 'f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- 07_kyc_private_bucket.sql
-- Review fix (2026-10-09): KYC documents (ID card, selfie, bank book) must not live in a public bucket.
--
-- Until now they were stored in `project-media` under anthem/kyc/<user>/..., and `project-media` is a PUBLIC bucket:
-- anyone holding an object URL can download it, because public buckets are served without evaluating storage RLS.
-- The policy that hides the kyc folder only applies to API access (list / authenticated download), not to /object/public/ URLs.
--
-- New private bucket `kyc-documents`, path convention <user_id>/<doc_type>/<uuid>.<ext>:
--   * the owner can upload into their own folder,
--   * the owner and admins can read (the app only ever uses short-lived signed URLs),
--   * the owner can delete only while no KYC request is pending/approved (same rule as the old policy),
--   * nobody can UPDATE (the client no longer uses upsert; names are random UUIDs).
-- Existing objects are moved by Anthem-Code/scripts/migrate-kyc-to-private-bucket.mjs, which also rewrites
-- shared.kyc_documents.storage_path. Until then the app still reads legacy `anthem/kyc/...` paths from project-media.
-- Deploy order: apply this migration, then deploy the app, then run the move script.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.kyc_documents_owner_mutable(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public, storage
AS $$
  SELECT (storage.foldername(_path))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
      FROM shared.kyc_requests r
      WHERE r.user_id = auth.uid()
        AND r.status IN ('pending', 'approved')
    );
$$;

REVOKE ALL ON FUNCTION public.kyc_documents_owner_mutable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kyc_documents_owner_mutable(text) TO authenticated;

DROP POLICY IF EXISTS "kyc documents owner upload" ON storage.objects;
CREATE POLICY "kyc documents owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "kyc documents owner or admin read" ON storage.objects;
CREATE POLICY "kyc documents owner or admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "kyc documents owner delete" ON storage.objects;
CREATE POLICY "kyc documents owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.kyc_documents_owner_mutable(name)
  );

-- ---------------------------------------------------------------- 08_px_gifts_off_mock_pay_off.sql
-- 2026-10-09: PX and gifts are out of the product for now; mock payments must not exist in production.
--
-- 1) payment_settings.mock_topup_enabled = true let ANY signed-in buyer confirm their own hire order as paid with a
--    charge id starting with "mock_" (shared.confirm_hire_order_payment): the order turns "paid" and nobody pays.
--    It is meant for demos only. Switch it off; also switch off the Stripe PX top-up flag (Stripe is cut over).
-- 2) The functions that CHANGE PX balances or send money-like value were callable by every signed-in user (and, for
--    the daily / mission claims, by anon). The app UI is already hidden (VITE_APLUS1_PX_ENABLED / GIFT_ECONOMY), but a
--    hidden button is not a lock. Client EXECUTE is revoked; service_role keeps it for server jobs.
--
-- To bring the PX economy back later:  GRANT EXECUTE ON FUNCTION <the function> TO authenticated;
--   (daily / mission claims also need `anon` removed, they check auth.uid()). Do NOT re-enable mock_topup_enabled in production.

UPDATE public.payment_settings
   SET mock_topup_enabled = false,
       stripe_px_enabled = false,
       updated_at = now()
 WHERE id = 1;

REVOKE ALL ON FUNCTION public.send_gift(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_px() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_welcome_mission(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.request_cashout(integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_px() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_welcome_mission(text) TO service_role;
GRANT EXECUTE ON FUNCTION anthem.request_cashout(integer, jsonb) TO service_role;

-- Read helpers: signed-in only (they were open to anon).
REVOKE ALL ON FUNCTION public.daily_px_claim_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._check_welcome_mission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_px_claim_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._check_welcome_mission(uuid, text) TO authenticated, service_role;

-- Collab group expand: 1:1 chat → group with plan migrate/fresh, partner must approve first.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS shared.collab_group_expand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_conversation_id uuid NOT NULL,
  collab_request_id uuid,
  proposed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'withdrawn', 'approved', 'rejected', 'expired')),
  group_title text NOT NULL,
  new_member_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  plan_mode text NOT NULL DEFAULT 'migrate'
    CHECK (plan_mode IN ('migrate', 'fresh')),
  plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_plan_step text,
  ack_preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_note text,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  result_conversation_id uuid,
  first_submitted_at timestamptz NOT NULL DEFAULT now(),
  edit_until_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collab_group_expand_one_pending_idx
  ON shared.collab_group_expand_requests (source_conversation_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS collab_group_expand_source_idx
  ON shared.collab_group_expand_requests (source_conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON shared.collab_group_expand_requests TO authenticated;
GRANT ALL ON shared.collab_group_expand_requests TO service_role;

ALTER TABLE shared.collab_group_expand_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION shared.collab_group_expand_is_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO shared, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shared.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM shared.conversations c
    WHERE c.id = p_conversation_id
      AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION shared.collab_group_expand_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shared.collab_group_expand_is_participant(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "collab group expand participants read" ON shared.collab_group_expand_requests;
CREATE POLICY "collab group expand participants read"
  ON shared.collab_group_expand_requests FOR SELECT TO authenticated
  USING (shared.collab_group_expand_is_participant(source_conversation_id));

DROP POLICY IF EXISTS "collab group expand participants insert" ON shared.collab_group_expand_requests;
CREATE POLICY "collab group expand participants insert"
  ON shared.collab_group_expand_requests FOR INSERT TO authenticated
  WITH CHECK (
    shared.collab_group_expand_is_participant(source_conversation_id)
    AND auth.uid() = proposed_by
  );

DROP POLICY IF EXISTS "collab group expand participants update" ON shared.collab_group_expand_requests;
CREATE POLICY "collab group expand participants update"
  ON shared.collab_group_expand_requests FOR UPDATE TO authenticated
  USING (shared.collab_group_expand_is_participant(source_conversation_id))
  WITH CHECK (shared.collab_group_expand_is_participant(source_conversation_id));

CREATE OR REPLACE FUNCTION public.notify_collab_group_expand_event(
  p_to_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_expand_id uuid,
  p_source_conversation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_to_user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    p_to_user_id,
    'anthem',
    'collab_group_expand',
    coalesce(nullif(btrim(p_title), ''), 'ชวนสร้างกลุ่มคอลแลป'),
    coalesce(p_body, ''),
    coalesce(nullif(btrim(p_link), ''), '/chat'),
    jsonb_build_object(
      'expand_request_id', p_expand_id,
      'source_conversation_id', p_source_conversation_id
    ),
    false,
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_collab_group_expand_event(uuid, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_collab_group_expand_event(uuid, text, text, text, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_collab_group_expand_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, public
AS $$
DECLARE
  n int := 0;
BEGIN
  UPDATE shared.collab_group_expand_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_collab_group_expand_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_collab_group_expand_requests() TO authenticated, service_role;

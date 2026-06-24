-- Studio hire: client -> studio (anthem.hiring_requests) + admin inbox

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES anthem.studios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'freelancer'
    CHECK (target_type IN ('freelancer', 'studio'));

ALTER TABLE anthem.hiring_requests
  ALTER COLUMN freelancer_id DROP NOT NULL;

ALTER TABLE anthem.hiring_requests DROP CONSTRAINT IF EXISTS hiring_requests_target_chk;
ALTER TABLE anthem.hiring_requests ADD CONSTRAINT hiring_requests_target_chk
  CHECK (
    (target_type = 'freelancer' AND freelancer_id IS NOT NULL AND studio_id IS NULL)
    OR (target_type = 'studio' AND studio_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS hiring_requests_studio_id_idx
  ON anthem.hiring_requests (studio_id)
  WHERE studio_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_studio_admin(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM anthem.studio_members sm
    WHERE sm.studio_id = p_studio_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_studio_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view requests" ON anthem.hiring_requests;
CREATE POLICY "Anyone can view requests"
  ON anthem.hiring_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Freelancer can update their requests" ON anthem.hiring_requests;
CREATE POLICY "Freelancer can update their requests"
  ON anthem.hiring_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
  );

DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
CREATE POLICY "Authenticated users can create requests"
  ON anthem.hiring_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND (
      (target_type = 'freelancer' AND freelancer_id IS NOT NULL)
      OR (target_type = 'studio' AND studio_id IS NOT NULL)
    )
  );

CREATE OR REPLACE FUNCTION public.accept_studio_hire_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hire anthem.hiring_requests%ROWTYPE;
  v_conv_id uuid;
  v_owner_id uuid;
  v_member record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_hire
  FROM anthem.hiring_requests
  WHERE id = p_request_id
    AND target_type = 'studio'
    AND studio_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'studio hire not found';
  END IF;

  IF NOT public.is_studio_admin(v_hire.studio_id) THEN
    RAISE EXCEPTION 'not studio admin';
  END IF;

  UPDATE anthem.hiring_requests
  SET status = 'ตอบรับ', updated_at = now()
  WHERE id = p_request_id;

  SELECT id INTO v_conv_id
  FROM shared.conversations
  WHERE kind = 'hire' AND request_id = p_request_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  SELECT sm.user_id INTO v_owner_id
  FROM anthem.studio_members sm
  WHERE sm.studio_id = v_hire.studio_id AND sm.role = 'owner'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    SELECT sm.user_id INTO v_owner_id
    FROM anthem.studio_members sm
    WHERE sm.studio_id = v_hire.studio_id AND sm.role = 'admin'
    ORDER BY sm.joined_at ASC
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'studio has no owner';
  END IF;

  INSERT INTO shared.conversations (
    kind,
    conversation_type,
    request_id,
    client_id,
    freelancer_id,
    studio_id,
    project_id,
    project_title,
    created_by
  ) VALUES (
    'hire',
    'direct',
    p_request_id,
    v_hire.client_id,
    v_owner_id,
    v_hire.studio_id,
    v_hire.project_id,
    COALESCE(v_hire.project_title, 'งานจ้าง Studio'),
    v_uid
  )
  RETURNING id INTO v_conv_id;

  FOR v_member IN
    SELECT sm.user_id, sm.role
    FROM anthem.studio_members sm
    WHERE sm.studio_id = v_hire.studio_id
      AND sm.role IN ('owner', 'admin')
  LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, role)
    VALUES (
      v_conv_id,
      v_member.user_id,
      CASE WHEN v_member.role = 'owner' THEN 'owner' ELSE 'admin' END
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_studio_hire_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_studio_hire_request(uuid) TO authenticated, service_role;

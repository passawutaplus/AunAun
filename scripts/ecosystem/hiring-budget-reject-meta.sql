-- Hire request: budget range, job-type other detail, reject/forward metadata
-- Apply on unified Supabase (anthem schema)

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS budget_min integer,
  ADD COLUMN IF NOT EXISTS budget_max integer,
  ADD COLUMN IF NOT EXISTS job_type text,
  ADD COLUMN IF NOT EXISTS job_type_other text,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS reject_note text,
  ADD COLUMN IF NOT EXISTS forwarded_to_user_id uuid,
  ADD COLUMN IF NOT EXISTS forwarded_from_request_id uuid;

ALTER TABLE anthem.hiring_requests
  DROP CONSTRAINT IF EXISTS hiring_requests_budget_range_chk;
ALTER TABLE anthem.hiring_requests
  ADD CONSTRAINT hiring_requests_budget_range_chk
  CHECK (
    budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
  );

COMMENT ON COLUMN anthem.hiring_requests.budget_min IS 'Client budget range low (THB)';
COMMENT ON COLUMN anthem.hiring_requests.budget_max IS 'Client budget range high (THB)';
COMMENT ON COLUMN anthem.hiring_requests.reject_reason IS 'queue_full | not_this_type | budget_timeline | busy_but_chat | forwarded | other';

-- SECURITY DEFINER helper: avoid RLS infinite recursion when policies/triggers
-- need to read parent hiring_requests rows.
CREATE OR REPLACE FUNCTION anthem.is_hiring_request_freelancer(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM anthem.hiring_requests
    WHERE id = _request_id
      AND freelancer_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION anthem.is_hiring_request_freelancer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.is_hiring_request_freelancer(uuid, uuid) TO authenticated, service_role;

-- Allow original freelancer to see forwarded child hire status
DROP POLICY IF EXISTS "Forward source can view child hire" ON anthem.hiring_requests;
CREATE POLICY "Forward source can view child hire"
  ON anthem.hiring_requests
  FOR SELECT
  TO authenticated
  USING (
    forwarded_from_request_id IS NOT NULL
    AND anthem.is_hiring_request_freelancer(forwarded_from_request_id, auth.uid())
  );

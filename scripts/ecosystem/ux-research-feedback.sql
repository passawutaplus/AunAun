-- UX research session feedback (public form at /research/feedback, no login required)
-- Apply on unified Supabase project after ecosystem baseline.

CREATE TABLE IF NOT EXISTS anthem.ux_research_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  persona text NOT NULL,
  devices text[] NOT NULL DEFAULT '{}',
  tasks_done text[] NOT NULL DEFAULT '{}',
  sections_done text[] NOT NULL DEFAULT '{}',
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  viewport text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ux_research_submissions_created_idx
  ON anthem.ux_research_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS ux_research_submissions_reviewer_created_idx
  ON anthem.ux_research_submissions (lower(trim(reviewer_name)), created_at DESC);

ALTER TABLE anthem.ux_research_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ux research admin read" ON anthem.ux_research_submissions;
CREATE POLICY "ux research admin read"
  ON anthem.ux_research_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON anthem.ux_research_submissions TO authenticated;
GRANT ALL ON anthem.ux_research_submissions TO service_role;

CREATE OR REPLACE FUNCTION anthem.submit_ux_research(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  _name text := trim(coalesce(payload->>'reviewer_name', ''));
  _persona text := trim(coalesce(payload->>'persona', ''));
  _devices text[];
  _tasks text[];
  _sections text[];
  _scores jsonb := coalesce(payload->'scores', '{}'::jsonb);
  _answers jsonb := coalesce(payload->'answers', '{}'::jsonb);
  _viewport text := left(trim(coalesce(payload->>'viewport', '')), 32);
  _user_agent text := left(trim(coalesce(payload->>'user_agent', '')), 512);
  _allowed_personas text[] := ARRAY['guest', 'creator-new', 'creator-popular', 'hirer'];
  _score_keys text[] := ARRAY[
    'first_impression', 'thai_copy', 'navigation', 'next_step',
    'px_system', 'hire_collab', 'mobile_ux', 'overall'
  ];
  _key text;
  _score int;
  _recent_name int;
  _recent_agent int;
  _id uuid;
BEGIN
  IF length(_name) < 2 OR length(_name) > 80 THEN
    RAISE EXCEPTION 'INVALID: กรุณาใส่ชื่อ reviewer 2–80 ตัวอักษร';
  END IF;

  IF NOT (_persona = ANY(_allowed_personas)) THEN
    RAISE EXCEPTION 'INVALID: persona ไม่ถูกต้อง';
  END IF;

  SELECT coalesce(array_agg(trim(value)), '{}')
    INTO _devices
  FROM jsonb_array_elements_text(coalesce(payload->'devices', '[]'::jsonb)) AS t(value)
  WHERE trim(value) <> '';

  SELECT coalesce(array_agg(upper(trim(value))), '{}')
    INTO _tasks
  FROM jsonb_array_elements_text(coalesce(payload->'tasks_done', '[]'::jsonb)) AS t(value)
  WHERE upper(trim(value)) ~ '^T[1-8]$';

  SELECT coalesce(array_agg(upper(trim(value))), '{}')
    INTO _sections
  FROM jsonb_array_elements_text(coalesce(payload->'sections_done', '[]'::jsonb)) AS t(value)
  WHERE upper(trim(value)) ~ '^[A-T]$';

  FOREACH _key IN ARRAY _score_keys LOOP
    IF NOT (_scores ? _key) OR (_scores->>_key) !~ '^[1-5]$' THEN
      RAISE EXCEPTION 'INVALID: กรุณาให้คะแนน 1–5 ครบทุกข้อ';
    END IF;
    _score := (_scores->>_key)::int;
    IF _score < 1 OR _score > 5 THEN
      RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1–5';
    END IF;
  END LOOP;

  IF jsonb_typeof(_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'INVALID: answers ไม่ถูกต้อง';
  END IF;

  SELECT count(*) INTO _recent_name
  FROM anthem.ux_research_submissions
  WHERE lower(trim(reviewer_name)) = lower(_name)
    AND created_at > now() - interval '1 hour';

  IF _recent_name >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งได้ไม่เกิน 3 ครั้งต่อชั่วโมงต่อชื่อ';
  END IF;

  IF _user_agent <> '' THEN
    SELECT count(*) INTO _recent_agent
    FROM anthem.ux_research_submissions
    WHERE user_agent = _user_agent
      AND created_at > now() - interval '1 hour';

    IF _recent_agent >= 10 THEN
      RAISE EXCEPTION 'RATE_LIMIT: ส่งบ่อยเกินไป — ลองใหม่ภายหลัง';
    END IF;
  END IF;

  INSERT INTO anthem.ux_research_submissions (
    reviewer_name,
    persona,
    devices,
    tasks_done,
    sections_done,
    scores,
    answers,
    viewport,
    user_agent
  ) VALUES (
    _name,
    _persona,
    coalesce(_devices, '{}'),
    coalesce(_tasks, '{}'),
    coalesce(_sections, '{}'),
    _scores,
    jsonb_build_object(
      'good', coalesce(
        (
          SELECT jsonb_agg(left(trim(value), 500))
          FROM jsonb_array_elements_text(coalesce(_answers->'good', '[]'::jsonb)) AS t(value)
          WHERE trim(value) <> ''
        ),
        '[]'::jsonb
      ),
      'fix', coalesce(
        (
          SELECT jsonb_agg(left(trim(value), 500))
          FROM jsonb_array_elements_text(coalesce(_answers->'fix', '[]'::jsonb)) AS t(value)
          WHERE trim(value) <> ''
        ),
        '[]'::jsonb
      ),
      'other', left(trim(coalesce(_answers->>'other', '')), 1000)
    ),
    NULLIF(_viewport, ''),
    NULLIF(_user_agent, '')
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION anthem.submit_ux_research(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.submit_ux_research(jsonb) TO anon, authenticated;

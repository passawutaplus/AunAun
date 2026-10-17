-- Beta feedback: new kinds (ux/praise/rating), auto diagnostics, Beta badge progress.

-- 1) Kinds
ALTER TABLE anthem.app_feedback DROP CONSTRAINT IF EXISTS app_feedback_kind_check;
ALTER TABLE anthem.app_feedback ADD CONSTRAINT app_feedback_kind_check
  CHECK (kind IS NULL OR kind = ANY (ARRAY['bug', 'idea', 'error', 'ux', 'praise', 'rating']));

-- 2) Diagnostics (browser, viewport, app version, recent console errors)
ALTER TABLE anthem.app_feedback ADD COLUMN IF NOT EXISTS diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION anthem.submit_feedback(
  _feature text,
  _route text,
  _rating integer DEFAULT NULL,
  _message text DEFAULT '',
  _project_id uuid DEFAULT NULL,
  _user_agent text DEFAULT '',
  _viewport text DEFAULT '',
  _kind text DEFAULT NULL,
  _screenshot_path text DEFAULT NULL,
  _annotation_json jsonb DEFAULT '{}'::jsonb,
  _diagnostics jsonb DEFAULT '{}'::jsonb
)
RETURNS anthem.app_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  recent_min int;
  recent_hour int;
  f anthem.app_feedback;
  kind_val text;
  shot_val text;
  shot_path text;
  comments_in jsonb;
  comments_out jsonb := '[]'::jsonb;
  diag jsonb := '{}'::jsonb;
  item jsonb;
  nx numeric;
  ny numeric;
  num int;
  txt text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  kind_val := NULLIF(lower(btrim(COALESCE(_kind, ''))), '');
  IF kind_val IS NOT NULL AND kind_val NOT IN ('bug', 'idea', 'error', 'ux', 'praise', 'rating') THEN
    RAISE EXCEPTION 'INVALID: แท็กไม่ถูกต้อง';
  END IF;

  IF _rating IS NOT NULL AND (_rating < 1 OR _rating > 5) THEN
    RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1-5';
  END IF;

  IF kind_val IS NULL AND _rating IS NULL THEN
    RAISE EXCEPTION 'INVALID: ต้องเลือกแท็กหรือให้คะแนน';
  END IF;

  IF kind_val = 'rating' AND _rating IS NULL THEN
    RAISE EXCEPTION 'INVALID: ต้องให้คะแนน';
  END IF;

  shot_val := NULLIF(btrim(COALESCE(_screenshot_path, '')), '');
  IF shot_val IS NOT NULL THEN
    IF position('..' in shot_val) > 0 THEN
      RAISE EXCEPTION 'INVALID: ทางรูปแนบไม่ถูกต้อง';
    END IF;
    IF shot_val LIKE 'feedback-screenshots:%' THEN
      shot_path := substr(shot_val, length('feedback-screenshots:') + 1);
    ELSE
      shot_path := shot_val;
      shot_val := 'feedback-screenshots:' || shot_path;
    END IF;
    IF shot_path IS NULL OR shot_path NOT LIKE (uid::text || '/%') THEN
      RAISE EXCEPTION 'INVALID: ทางรูปแนบไม่ถูกต้อง';
    END IF;
  ELSE
    shot_val := '';
  END IF;

  IF kind_val IS NOT NULL AND kind_val <> 'rating'
     AND btrim(COALESCE(_message, '')) = ''
     AND shot_val = '' THEN
    RAISE EXCEPTION 'INVALID: ใส่ข้อความหรือแนบภาพอย่างน้อยหนึ่งอย่าง';
  END IF;

  IF _annotation_json IS NOT NULL AND jsonb_typeof(_annotation_json) = 'object' THEN
    comments_in := COALESCE(_annotation_json->'comments', '[]'::jsonb);
    IF jsonb_typeof(comments_in) = 'array' THEN
      FOR item IN SELECT jsonb_array_elements(comments_in)
      LOOP
        IF jsonb_array_length(comments_out) >= 20 THEN
          EXIT;
        END IF;
        IF COALESCE(item->>'nx', '') !~ '^[0-9]*\.?[0-9]+$' THEN
          CONTINUE;
        END IF;
        IF COALESCE(item->>'ny', '') !~ '^[0-9]*\.?[0-9]+$' THEN
          CONTINUE;
        END IF;
        nx := LEAST(1, GREATEST(0, (item->>'nx')::numeric));
        ny := LEAST(1, GREATEST(0, (item->>'ny')::numeric));
        IF COALESCE(item->>'number', '') ~ '^[0-9]+$' THEN
          num := (item->>'number')::int;
        ELSE
          num := jsonb_array_length(comments_out) + 1;
        END IF;
        IF num < 1 THEN num := 1; END IF;
        IF num > 99 THEN num := 99; END IF;
        txt := left(btrim(COALESCE(item->>'text', '')), 500);
        comments_out := comments_out || jsonb_build_array(
          jsonb_build_object('number', num, 'nx', nx, 'ny', ny, 'text', txt)
        );
      END LOOP;
    END IF;
  END IF;

  -- Keep diagnostics small: whole object if under 8 KB, else drop the console log.
  IF _diagnostics IS NOT NULL AND jsonb_typeof(_diagnostics) = 'object' THEN
    diag := _diagnostics;
    IF octet_length(diag::text) > 8000 THEN
      diag := diag - 'errors';
    END IF;
    IF octet_length(diag::text) > 8000 THEN
      diag := '{}'::jsonb;
    END IF;
  END IF;

  SELECT COUNT(*) INTO recent_min FROM anthem.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent_min >= 1 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กเร็วเกินไป กรุณารอสักครู่';
  END IF;

  SELECT COUNT(*) INTO recent_hour FROM anthem.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 hour';
  IF recent_hour >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กถึงขีดจำกัดต่อชั่วโมงแล้ว';
  END IF;

  INSERT INTO anthem.app_feedback(
    user_id, feature, route, rating, message, project_id, user_agent, viewport,
    kind, screenshot_path, annotation_json, diagnostics
  ) VALUES (
    uid,
    COALESCE(NULLIF(btrim(_feature), ''), 'general'),
    COALESCE(_route, ''),
    _rating,
    COALESCE(_message, ''),
    _project_id,
    COALESCE(left(_user_agent, 500), ''),
    COALESCE(_viewport, ''),
    kind_val,
    shot_val,
    jsonb_build_object('comments', comments_out),
    diag
  ) RETURNING * INTO f;

  RETURN f;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb, jsonb) TO authenticated;

-- 3) Beta badge progress.
-- Counted feedback = non-empty message (not a bare rating), max 3 per Bangkok day.
-- Tiers: 1 = beta_tester, 5 = beta_builder, 15 = core_builder. co_creator = an idea marked 'adopted'.
CREATE OR REPLACE FUNCTION anthem.get_beta_badge(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $function$
  WITH ranked AS (
    SELECT row_number() OVER (
      PARTITION BY (created_at AT TIME ZONE 'Asia/Bangkok')::date
      ORDER BY created_at
    ) AS rn
    FROM anthem.app_feedback
    WHERE user_id = _user_id
      AND btrim(message) <> ''
      AND COALESCE(kind, '') <> 'rating'
  ),
  agg AS (
    SELECT COUNT(*) FILTER (WHERE rn <= 3)::int AS n FROM ranked
  ),
  adopted AS (
    SELECT EXISTS (
      SELECT 1 FROM anthem.app_feedback
      WHERE user_id = _user_id AND status = 'adopted'
    ) AS yes
  )
  SELECT jsonb_build_object(
    'count', agg.n,
    'points', agg.n * 10,
    'co_creator', adopted.yes,
    'tier', CASE
      WHEN agg.n >= 15 THEN 'core_builder'
      WHEN agg.n >= 5 THEN 'beta_builder'
      WHEN agg.n >= 1 THEN 'beta_tester'
      ELSE NULL
    END
  )
  FROM agg, adopted;
$function$;

REVOKE ALL ON FUNCTION anthem.get_beta_badge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.get_beta_badge(uuid) TO anon, authenticated;

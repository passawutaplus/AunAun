-- Interactive comment pins on feedback screenshots (not baked into the JPEG).

ALTER TABLE anthem.app_feedback
  ADD COLUMN IF NOT EXISTS annotation_json jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text);

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
  _annotation_json jsonb DEFAULT '{}'::jsonb
)
RETURNS anthem.app_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $$
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
  IF kind_val IS NOT NULL AND kind_val NOT IN ('bug', 'idea', 'error') THEN
    RAISE EXCEPTION 'INVALID: แท็กไม่ถูกต้อง';
  END IF;

  IF _rating IS NOT NULL AND (_rating < 1 OR _rating > 5) THEN
    RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1-5';
  END IF;

  IF kind_val IS NULL AND _rating IS NULL THEN
    RAISE EXCEPTION 'INVALID: ต้องเลือกแท็กหรือให้คะแนน';
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

  IF kind_val IS NOT NULL
     AND btrim(COALESCE(_message, '')) = ''
     AND shot_val = '' THEN
    RAISE EXCEPTION 'INVALID: ใส่ข้อความหรือแนบภาพอย่างน้อยอย่างหนึ่งอย่างหนึ่ง';
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
    kind, screenshot_path, annotation_json
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
    jsonb_build_object('comments', comments_out)
  ) RETURNING * INTO f;

  RETURN f;
END;
$$;

REVOKE ALL ON FUNCTION anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.submit_feedback(text, text, integer, text, uuid, text, text, text, text, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

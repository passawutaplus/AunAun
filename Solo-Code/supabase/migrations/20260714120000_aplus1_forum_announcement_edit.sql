-- Allow admins to edit published forum announcements (title/body/tags/lock)

CREATE OR REPLACE FUNCTION public.admin_update_forum_announcement(
  _topic_id uuid,
  _title text,
  _body text,
  _tags text[] DEFAULT NULL,
  _lock_comments boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_announce boolean;
  _cat_slug text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  IF char_length(trim(coalesce(_title, ''))) < 3 THEN
    RAISE EXCEPTION 'INVALID: หัวข้อสั้นเกินไป';
  END IF;
  IF char_length(trim(coalesce(_body, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: กรุณากรอกรายละเอียด';
  END IF;

  SELECT t.is_announcement, c.slug
    INTO _is_announce, _cat_slug
  FROM anthem.forum_topics t
  JOIN anthem.forum_categories c ON c.id = t.category_id
  WHERE t.id = _topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID: ไม่พบประกาศ';
  END IF;

  IF NOT coalesce(_is_announce, false) AND _cat_slug <> 'announcements' THEN
    RAISE EXCEPTION 'INVALID: กระทู้นี้ไม่ใช่ประกาศจากทีม';
  END IF;

  UPDATE anthem.forum_topics SET
    title = trim(_title),
    body = trim(_body),
    tags = coalesce(_tags, tags),
    is_locked = coalesce(_lock_comments, is_locked),
    is_announcement = true,
    updated_at = now()
  WHERE id = _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_forum_announcement(uuid, text, text, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_forum_announcement(uuid, text, text, text[], boolean) TO authenticated;

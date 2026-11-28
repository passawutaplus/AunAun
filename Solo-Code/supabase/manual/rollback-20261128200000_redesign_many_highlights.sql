-- Rollback of 20261128200000_redesign_many_highlights.sql: one highlighted event at a time again.
-- Keeps the most recently highlighted event and un-highlights the others first.

UPDATE anthem.events e
   SET is_featured = false, featured_until = NULL, featured_at = NULL
 WHERE e.is_featured
   AND e.id <> (SELECT id FROM anthem.events WHERE is_featured ORDER BY featured_at DESC NULLS LAST LIMIT 1);

CREATE UNIQUE INDEX IF NOT EXISTS events_one_featured ON anthem.events ((is_featured)) WHERE is_featured;

CREATE OR REPLACE FUNCTION public.admin_set_event_featured(_id uuid, _on boolean, _until date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM anthem.events WHERE id = _id AND status = 'published' AND parent_id IS NULL) THEN
      RAISE EXCEPTION 'ปักหมุดได้เฉพาะงานหลักที่เผยแพร่แล้ว';
    END IF;
    IF _until IS NOT NULL AND _until < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
      RAISE EXCEPTION 'วันสิ้นสุดการปักหมุดต้องไม่ใช่วันที่ผ่านมาแล้ว';
    END IF;
    UPDATE anthem.events SET is_featured = false, featured_until = NULL, featured_at = NULL
     WHERE is_featured AND id <> _id;
    UPDATE anthem.events SET is_featured = true, featured_until = _until, featured_at = now() WHERE id = _id;
  ELSE
    UPDATE anthem.events SET is_featured = false, featured_until = NULL, featured_at = NULL WHERE id = _id;
  END IF;
  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _on THEN 'event_feature' ELSE 'event_unfeature' END, 'event', _id::text,
          jsonb_build_object('until', _until));
END;
$$;

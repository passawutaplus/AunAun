-- Redesign (home → Event → Highlight): several highlighted events at once, with arrows to go between
-- them (owner 2026-11-28; the new Highlight already slides between them). Until now one event at a time:
--   * unique index events_one_featured, and
--   * admin_set_event_featured cleared every other highlight when one was set.
-- Also highlights Chiang Mai Design Week 2026 (owner request) until it ends on 13 Dec 2026.
-- The old site's banner read "the" featured event with maybeSingle(); PR to main makes it take the newest.
-- Rollback: supabase/manual/rollback-20261128200000_redesign_many_highlights.sql

DROP INDEX IF EXISTS anthem.events_one_featured;

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
    -- Other highlights stay (several at once).
    UPDATE anthem.events SET is_featured = true, featured_until = _until, featured_at = now() WHERE id = _id;
  ELSE
    UPDATE anthem.events SET is_featured = false, featured_until = NULL, featured_at = NULL WHERE id = _id;
  END IF;
  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _on THEN 'event_feature' ELSE 'event_unfeature' END, 'event', _id::text,
          jsonb_build_object('until', _until));
END;
$$;

UPDATE anthem.events
   SET is_featured = true, featured_until = '2026-12-13', featured_at = now()
 WHERE id = '034a7990-3489-45cd-8013-09ebcbe34e38'
   AND status = 'published';

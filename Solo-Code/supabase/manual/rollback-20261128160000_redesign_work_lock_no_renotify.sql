-- Rollback of 20261128160000_redesign_work_lock_no_renotify.sql: the two "work published"
-- triggers fire again on every Private -> Published change (their state before 2026-11-28).

CREATE OR REPLACE FUNCTION anthem.notify_explore_followers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'Published' OR (TG_OP = 'UPDATE' AND OLD.status = 'Published') THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    SELECT DISTINCT ON (f.user_id)
      f.user_id,
      'anthem',
      'explore_follow',
      CASE WHEN f.kind = 'tag' THEN 'ผลงานใหม่ในแท็ก #' || f.value ELSE 'ผลงานใหม่ที่ใช้ ' || f.value END,
      NEW.title,
      '/project/' || NEW.id::text,
      jsonb_build_object('project_id', NEW.id, 'kind', f.kind, 'value', f.value)
    FROM anthem.explore_follows f
    WHERE f.user_id <> NEW.owner_id
      AND (
        (f.kind = 'tag' AND f.value = ANY (SELECT lower(trim(both '#' from t)) FROM unnest(COALESCE(NEW.tags, '{}')) t))
        OR (f.kind = 'tool' AND f.value = ANY (SELECT lower(t) FROM unnest(COALESCE(NEW.tools, '{}')) t))
      )
    ORDER BY f.user_id, f.kind;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_explore_followers failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION anthem.trg_project_published_collab_invites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
BEGIN
  IF NEW.status = 'Published' AND OLD.status IS DISTINCT FROM 'Published' THEN
    PERFORM anthem.notify_project_collab_invitees(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

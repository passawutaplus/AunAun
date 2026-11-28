-- Redesign step 8 (MyProfile): the globe/lock on each of my works switches it between
-- 'Published' and 'Private' (status the old editor already uses; RLS already hides Private
-- works from everyone but the owner and admins).
-- Unlocking a work (Private -> Published) must not count as a new work: before this, the
-- two "work published" triggers fired again on every unlock and re-sent
--   * explore_follow notifications ("ผลงานใหม่ในแท็ก …") to people following its tags/tools,
--   * the collaborator invitations of the work.
-- Now they fire only when a work leaves Draft (or is inserted as Published), as before for
-- Draft -> Published. A work first saved as Private and later unlocked sends nothing.
-- Rollback: supabase/manual/rollback-20261128160000_redesign_work_lock_no_renotify.sql

CREATE OR REPLACE FUNCTION anthem.notify_explore_followers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'Published' OR (TG_OP = 'UPDATE' AND OLD.status IN ('Published', 'Private')) THEN
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
  IF NEW.status = 'Published' AND OLD.status IS DISTINCT FROM 'Published' AND OLD.status IS DISTINCT FROM 'Private' THEN
    PERFORM anthem.notify_project_collab_invitees(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

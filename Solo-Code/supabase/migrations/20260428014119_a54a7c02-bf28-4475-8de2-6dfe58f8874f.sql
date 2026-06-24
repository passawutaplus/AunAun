-- Onboarding fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS persona TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_persona_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_persona_check
  CHECK (persona IS NULL OR persona IN ('freelancer','client'));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,                 -- recipient
  actor_user_id UUID,                    -- the user who triggered it (nullable for share/anon)
  actor_name TEXT NOT NULL DEFAULT '',
  actor_avatar TEXT,
  type TEXT NOT NULL,                    -- 'like' | 'comment' | 'hire' | 'share'
  project_id UUID,
  message TEXT NOT NULL DEFAULT '',
  url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients view own notifications" ON public.notifications;
CREATE POLICY "Recipients view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recipients update own notifications" ON public.notifications;
CREATE POLICY "Recipients update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recipients delete own notifications" ON public.notifications;
CREATE POLICY "Recipients delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- System inserts (via trigger using SECURITY DEFINER) — block client-side direct insert by NOT adding INSERT policy.
-- But authenticated users will need to insert via server logic; use trigger functions instead.

-- ===== Trigger: like => notify project owner =====
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  proj_title TEXT;
  actor_display TEXT;
  actor_avatar TEXT;
BEGIN
  SELECT user_id, title INTO owner_id, proj_title
    FROM public.portfolio_projects WHERE id = NEW.project_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW; -- skip self-likes
  END IF;

  SELECT COALESCE(display_name, brand_name, 'มีคน'),
         COALESCE(avatar_url, logo_url)
    INTO actor_display, actor_avatar
    FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, actor_avatar, type, project_id, message, url)
  VALUES
    (owner_id, NEW.user_id, COALESCE(actor_display, 'มีคน'), actor_avatar,
     'like', NEW.project_id,
     COALESCE(actor_display, 'มีคน') || ' กดถูกใจผลงาน "' || COALESCE(proj_title, '') || '"',
     '/p/' || NEW.project_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.portfolio_likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.portfolio_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ===== Trigger: comment => notify project owner =====
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  proj_title TEXT;
BEGIN
  SELECT user_id, title INTO owner_id, proj_title
    FROM public.portfolio_projects WHERE id = NEW.project_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, actor_avatar, type, project_id, message, url)
  VALUES
    (owner_id, NEW.user_id, COALESCE(NULLIF(NEW.author_name, ''), 'มีคน'), NEW.author_avatar,
     'comment', NEW.project_id,
     COALESCE(NULLIF(NEW.author_name, ''), 'มีคน') || ' คอมเมนต์ผลงาน "' || COALESCE(proj_title, '') || '"',
     '/p/' || NEW.project_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.portfolio_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.portfolio_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ===== Trigger: hire request => notify owner =====
CREATE OR REPLACE FUNCTION public.notify_on_hire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj_title TEXT;
BEGIN
  SELECT title INTO proj_title FROM public.portfolio_projects WHERE id = NEW.project_id;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, project_id, message, url)
  VALUES
    (NEW.owner_user_id, NULL,
     COALESCE(NULLIF(NEW.requester_name, ''), 'มีคน'),
     'hire', NEW.project_id,
     COALESCE(NULLIF(NEW.requester_name, ''), 'มีคน') || ' สนใจจ้างงาน "' || COALESCE(proj_title, '') || '"',
     '/dashboard');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_hire ON public.hire_requests;
CREATE TRIGGER trg_notify_on_hire
  AFTER INSERT ON public.hire_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_hire();

CREATE TABLE public.job_match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  match_score int NOT NULL DEFAULT 0,
  match_reasons text[] NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

GRANT SELECT, UPDATE, DELETE ON public.job_match_notifications TO authenticated;
GRANT ALL ON public.job_match_notifications TO service_role;

ALTER TABLE public.job_match_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own match notifications"
  ON public.job_match_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own match notifications"
  ON public.job_match_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own match notifications"
  ON public.job_match_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_jmn_user_unread
  ON public.job_match_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_jmn_job ON public.job_match_notifications(job_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_job_match boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_employment_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}';

-- Trigger: เรียก edge function เมื่อมีงานใหม่หรือ status เปลี่ยนเป็น open
CREATE OR REPLACE FUNCTION public.dispatch_job_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  IF NEW.status <> 'open' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' AND OLD.id = NEW.id
     AND OLD.title = NEW.title AND OLD.skills = NEW.skills
     AND OLD.role_category = NEW.role_category THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_functions_url', true);
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://uutbvwyoivqojozrangi.supabase.co/functions/v1/job-match-dispatch';
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER trg_dispatch_job_match
AFTER INSERT OR UPDATE OF status, skills, role_category, title
ON public.job_posts
FOR EACH ROW EXECUTE FUNCTION public.dispatch_job_match();

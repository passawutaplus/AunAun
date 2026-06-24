
-- Step comments for job tracker
CREATE TABLE public.job_tracker_step_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('owner','client')),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jtsc_job ON public.job_tracker_step_comments(job_id, step_index);
ALTER TABLE public.job_tracker_step_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their job comments"
  ON public.job_tracker_step_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid()));

CREATE POLICY "Owners insert comments on their jobs"
  ON public.job_tracker_step_comments FOR INSERT
  WITH CHECK (
    author_role = 'owner'
    AND EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid())
  );

CREATE POLICY "Owners delete their comments"
  ON public.job_tracker_step_comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid()));

CREATE POLICY "Admins view all step comments"
  ON public.job_tracker_step_comments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- AI chat tables
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aicm_user ON public.ai_chat_messages(user_id, created_at);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai messages"
  ON public.ai_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ai messages"
  ON public.ai_chat_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_chat_usage (
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai usage"
  ON public.ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ai usage"
  ON public.ai_chat_usage FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 1. Make hiring_requests.budget optional and add numeric budget_amount
ALTER TABLE public.hiring_requests
  ALTER COLUMN budget DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS budget_amount integer NULL;

-- Make message optional too
ALTER TABLE public.hiring_requests
  ALTER COLUMN message DROP NOT NULL;

-- 2. project_comments
CREATE TABLE public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_comments_project ON public.project_comments(project_id, created_at DESC);

GRANT SELECT ON public.project_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comments TO authenticated;
GRANT ALL ON public.project_comments TO service_role;

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.project_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their comments"
  ON public.project_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments"
  ON public.project_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON public.project_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;

-- 3. follows
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_following ON public.follows(following_id);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 1. New columns on planner_posts
ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS caption text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_platforms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vision_canvas_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS client_feedback text DEFAULT '';

-- 2. Share links table
CREATE TABLE IF NOT EXISTS public.planner_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  month text NOT NULL,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.planner_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners CRUD share links - select"
  ON public.planner_share_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - insert"
  ON public.planner_share_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - update"
  ON public.planner_share_links FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - delete"
  ON public.planner_share_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anyone with the token can view the share link metadata
CREATE POLICY "Public can view share links"
  ON public.planner_share_links FOR SELECT TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

-- 3. Public read of planner_posts via valid share link
CREATE POLICY "Public can view posts via share link"
  ON public.planner_posts FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.planner_share_links sl
      WHERE sl.user_id = planner_posts.user_id
        AND (sl.client_id IS NULL OR sl.client_id = planner_posts.client_id)
        AND to_char(planner_posts.post_date, 'YYYY-MM') = sl.month
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );

-- 4. Public can update approval fields only for posts under a valid share link
-- Use a security definer function for safe approval writes
CREATE OR REPLACE FUNCTION public.submit_post_approval(
  _share_token uuid,
  _post_id uuid,
  _status text,
  _feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link record;
  post record;
BEGIN
  IF _status NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT * INTO link FROM public.planner_share_links WHERE share_token = _share_token;
  IF link IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RAISE EXCEPTION 'token expired';
  END IF;

  SELECT * INTO post FROM public.planner_posts WHERE id = _post_id;
  IF post IS NULL THEN RAISE EXCEPTION 'post not found'; END IF;
  IF post.user_id <> link.user_id THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF link.client_id IS NOT NULL AND post.client_id <> link.client_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF to_char(post.post_date, 'YYYY-MM') <> link.month THEN
    RAISE EXCEPTION 'out of scope';
  END IF;

  UPDATE public.planner_posts
  SET approval_status = _status,
      client_feedback = COALESCE(_feedback, ''),
      status = CASE WHEN _status = 'approved' THEN 'approved' ELSE status END,
      updated_at = now()
  WHERE id = _post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_post_approval(uuid, uuid, text, text) TO anon, authenticated;

-- 5. Realtime
ALTER TABLE public.planner_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'planner_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_posts';
  END IF;
END $$;

-- 1. Remove the bypass policy on planner_posts; clients must go via get_planner_posts_by_token RPC
DROP POLICY IF EXISTS "Public can view posts via share link" ON public.planner_posts;

-- 2. Restrict auth_banner_slides public SELECT to active rows only
DROP POLICY IF EXISTS "Anyone can view active banner slides" ON public.auth_banner_slides;
CREATE POLICY "Anyone can view active banner slides"
  ON public.auth_banner_slides
  FOR SELECT
  USING (is_active = true);

-- 3. Allow users to INSERT their own ai_chat_messages
CREATE POLICY "Users insert own ai messages"
  ON public.ai_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to INSERT/UPDATE their own ai_chat_usage
CREATE POLICY "Users insert own ai usage"
  ON public.ai_chat_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai usage"
  ON public.ai_chat_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
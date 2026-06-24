
CREATE TABLE public.project_bookmarks (
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON public.project_bookmarks TO anon;
GRANT SELECT, INSERT, DELETE ON public.project_bookmarks TO authenticated;
GRANT ALL ON public.project_bookmarks TO service_role;
ALTER TABLE public.project_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookmarks viewable by everyone" ON public.project_bookmarks FOR SELECT USING (true);
CREATE POLICY "Users can insert own bookmarks" ON public.project_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.project_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.project_likes (
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON public.project_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.project_likes TO authenticated;
GRANT ALL ON public.project_likes TO service_role;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone" ON public.project_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.project_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.project_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

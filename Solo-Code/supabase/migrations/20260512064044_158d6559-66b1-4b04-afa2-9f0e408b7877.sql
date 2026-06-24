CREATE TABLE public.typo_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  heading_font TEXT NOT NULL,
  body_font TEXT NOT NULL,
  heading_weight INTEGER NOT NULL DEFAULT 700,
  body_weight INTEGER NOT NULL DEFAULT 400,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.typo_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own typo pairs" ON public.typo_pairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own typo pairs" ON public.typo_pairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own typo pairs" ON public.typo_pairs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own typo pairs" ON public.typo_pairs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_typo_pairs_user ON public.typo_pairs(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.typo_pairs;

-- Vision Canvas main table
CREATE TABLE public.vision_canvases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Vision',
  brief_id UUID REFERENCES public.design_briefs(id) ON DELETE SET NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  palette TEXT[] NOT NULL DEFAULT '{}',
  font TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  designer_note TEXT NOT NULL DEFAULT '',
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_canvases_user ON public.vision_canvases(user_id, updated_at DESC);
CREATE INDEX idx_vision_canvases_token ON public.vision_canvases(share_token);

ALTER TABLE public.vision_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select vision_canvases" ON public.vision_canvases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public select shared vision_canvases" ON public.vision_canvases
  FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Owners insert vision_canvases" ON public.vision_canvases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update vision_canvases" ON public.vision_canvases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete vision_canvases" ON public.vision_canvases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_vision_canvases_updated_at
  BEFORE UPDATE ON public.vision_canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reactions (likes + comments) from public viewers
CREATE TABLE public.vision_canvas_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id UUID NOT NULL REFERENCES public.vision_canvases(id) ON DELETE CASCADE,
  block_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('like','comment')),
  guest_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_canvas_reactions_canvas ON public.vision_canvas_reactions(canvas_id, created_at DESC);

ALTER TABLE public.vision_canvas_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert reactions on shared canvases" ON public.vision_canvas_reactions
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.is_public = true
    )
  );

CREATE POLICY "Public select reactions on shared canvases" ON public.vision_canvas_reactions
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.is_public = true
    )
  );

CREATE POLICY "Owners select reactions" ON public.vision_canvas_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete reactions" ON public.vision_canvas_reactions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.user_id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vision_canvases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vision_canvas_reactions;

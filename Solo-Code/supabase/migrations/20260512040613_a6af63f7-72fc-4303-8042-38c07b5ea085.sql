
CREATE TABLE public.user_color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_color_palettes_user ON public.user_color_palettes(user_id);

ALTER TABLE public.user_color_palettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select palettes" ON public.user_color_palettes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert palettes" ON public.user_color_palettes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update palettes" ON public.user_color_palettes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete palettes" ON public.user_color_palettes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_color_palettes_updated_at
BEFORE UPDATE ON public.user_color_palettes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_saved_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  palette_id UUID NOT NULL REFERENCES public.user_color_palettes(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_saved_colors_palette ON public.user_saved_colors(palette_id);
CREATE INDEX idx_user_saved_colors_user ON public.user_saved_colors(user_id);

ALTER TABLE public.user_saved_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select saved colors" ON public.user_saved_colors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert saved colors" ON public.user_saved_colors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update saved colors" ON public.user_saved_colors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete saved colors" ON public.user_saved_colors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Creative Labs: saved color palettes per user

CREATE TABLE IF NOT EXISTS public.color_palettes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.color_palette_colors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid NOT NULL REFERENCES public.color_palettes(id) ON DELETE CASCADE,
  hex        text NOT NULL,
  label      text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS color_palettes_user_idx ON public.color_palettes(user_id);
CREATE INDEX IF NOT EXISTS color_palette_colors_palette_idx ON public.color_palette_colors(palette_id);

ALTER TABLE public.color_palettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_palette_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY color_palettes_select ON public.color_palettes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY color_palettes_insert ON public.color_palettes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY color_palettes_update ON public.color_palettes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY color_palettes_delete ON public.color_palettes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY color_palette_colors_select ON public.color_palette_colors
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_insert ON public.color_palette_colors
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_update ON public.color_palette_colors
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_delete ON public.color_palette_colors
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_palettes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_palette_colors TO authenticated;
GRANT ALL ON public.color_palettes TO service_role;
GRANT ALL ON public.color_palette_colors TO service_role;

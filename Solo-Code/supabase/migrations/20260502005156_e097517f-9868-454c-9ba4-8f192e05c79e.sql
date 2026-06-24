-- 1) Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL DEFAULT '',
  banner_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active announcements are public"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins view all announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) last_active_at on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx
  ON public.profiles (last_active_at DESC NULLS LAST);

-- 3) RPC for users to bump their own last_active_at (cheap, no select roundtrip)
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET last_active_at = now()
   WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
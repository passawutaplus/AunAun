
-- 1. design_briefs table
CREATE TABLE public.design_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'บรีฟใหม่',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | awaiting_client | awaiting_confirm | confirmed
  client_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  project_overview JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  design_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  tech_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline_budget JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  confirmed_at TIMESTAMPTZ,
  confirmed_by_name TEXT,
  confirmed_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_briefs_user_id ON public.design_briefs(user_id);
CREATE INDEX idx_design_briefs_share_token ON public.design_briefs(share_token);

ALTER TABLE public.design_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own briefs"
  ON public.design_briefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own briefs"
  ON public.design_briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own briefs"
  ON public.design_briefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own briefs"
  ON public.design_briefs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_design_briefs_updated_at
  BEFORE UPDATE ON public.design_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Public access via share_token (security definer)
CREATE OR REPLACE FUNCTION public.get_brief_by_token(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'share_token', b.share_token,
    'title', b.title,
    'status', b.status,
    'client_info', b.client_info,
    'project_overview', b.project_overview,
    'audience', b.audience,
    'design_direction', b.design_direction,
    'tech_specs', b.tech_specs,
    'timeline_budget', b.timeline_budget,
    'notes', b.notes,
    'references', b."references",
    'confirmed_at', b.confirmed_at,
    'confirmed_by_name', b.confirmed_by_name,
    'created_at', b.created_at,
    'updated_at', b.updated_at,
    'owner', jsonb_build_object(
      'display_name', p.display_name,
      'brand_name', p.brand_name,
      'logo_url', p.logo_url,
      'avatar_url', p.avatar_url,
      'tagline', p.tagline
    )
  ) INTO result
  FROM public.design_briefs b
  LEFT JOIN public.profiles p ON p.user_id = b.user_id
  WHERE b.share_token = _token;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_brief_by_token(
  _token UUID,
  _client_info JSONB DEFAULT NULL,
  _project_overview JSONB DEFAULT NULL,
  _audience JSONB DEFAULT NULL,
  _design_direction JSONB DEFAULT NULL,
  _tech_specs JSONB DEFAULT NULL,
  _timeline_budget JSONB DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _references JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_status TEXT;
BEGIN
  SELECT status INTO cur_status FROM public.design_briefs WHERE share_token = _token;
  IF cur_status IS NULL THEN RETURN FALSE; END IF;
  IF cur_status = 'confirmed' THEN RETURN FALSE; END IF;

  UPDATE public.design_briefs
  SET
    client_info = COALESCE(_client_info, client_info),
    project_overview = COALESCE(_project_overview, project_overview),
    audience = COALESCE(_audience, audience),
    design_direction = COALESCE(_design_direction, design_direction),
    tech_specs = COALESCE(_tech_specs, tech_specs),
    timeline_budget = COALESCE(_timeline_budget, timeline_budget),
    notes = COALESCE(_notes, notes),
    "references" = COALESCE(_references, "references"),
    status = CASE WHEN status = 'awaiting_client' THEN 'awaiting_confirm' ELSE status END,
    updated_at = now()
  WHERE share_token = _token;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_brief_by_token(
  _token UUID,
  _name TEXT,
  _signature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  brief_owner UUID;
  brief_title TEXT;
  brief_id UUID;
BEGIN
  IF _name IS NULL OR length(btrim(_name)) < 1 THEN RETURN FALSE; END IF;

  UPDATE public.design_briefs
  SET status = 'confirmed',
      confirmed_at = now(),
      confirmed_by_name = btrim(_name),
      confirmed_signature = _signature,
      updated_at = now()
  WHERE share_token = _token AND status <> 'confirmed'
  RETURNING user_id, title, id INTO brief_owner, brief_title, brief_id;

  IF brief_owner IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO public.notifications
    (user_id, actor_name, type, message, url)
  VALUES
    (brief_owner, btrim(_name), 'brief_confirmed',
     btrim(_name) || ' ยืนยันบรีฟ "' || COALESCE(brief_title, '') || '" แล้ว ✓',
     '/dashboard?tab=planner&brief=' || brief_id::text);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_brief_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_brief_by_token(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_brief_by_token(UUID, TEXT, TEXT) TO anon, authenticated;

-- 3. Storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brief-references', 'brief-references', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brief refs public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brief-references');

CREATE POLICY "Brief refs anyone insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'brief-references');

CREATE POLICY "Brief refs owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brief-references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

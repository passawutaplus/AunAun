
-- Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  subtitle text DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL,
  cover_url text DEFAULT '',
  gallery_urls text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  price_thb integer,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Published','Draft','Private')),
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published projects"
  ON public.projects FOR SELECT
  USING (status = 'Published' OR auth.uid() = owner_id);

CREATE POLICY "Owners can insert"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status_created ON public.projects(status, created_at DESC);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('project-media', 'project-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');

CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

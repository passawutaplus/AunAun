-- ============ Saved clients: juristic person + contact fields ============
ALTER TABLE public.saved_clients
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- ============ Client files ============
CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.saved_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  doc_category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own client files"
  ON public.client_files FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own client files"
  ON public.client_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own client files"
  ON public.client_files FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_files_client ON public.client_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_files_user ON public.client_files(user_id);

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners view own client file objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload own client file objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own client file objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

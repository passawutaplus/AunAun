-- So1o Legal Desk: usage rights, checklists, documents, license verify

CREATE TABLE IF NOT EXISTS public.legal_usage_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  label text,
  work_type text NOT NULL DEFAULT 'other'
    CHECK (work_type IN ('logo', 'photo', 'video', 'social', 'web', 'source', 'other')),
  license_type text NOT NULL DEFAULT 'non_exclusive'
    CHECK (license_type IN ('exclusive', 'non_exclusive')),
  channels text[] NOT NULL DEFAULT '{}',
  territory text NOT NULL DEFAULT 'thailand'
    CHECK (territory IN ('thailand', 'worldwide', 'custom')),
  territory_custom text,
  term text NOT NULL DEFAULT 'project'
    CHECK (term IN ('1y', 'perpetual', 'project')),
  transfer_on text NOT NULL DEFAULT 'full_payment'
    CHECK (transfer_on IN ('full_payment', 'deposit', 'never')),
  deliverables text[] NOT NULL DEFAULT '{}',
  revision_rounds int NOT NULL DEFAULT 2 CHECK (revision_rounds >= 0 AND revision_rounds <= 20),
  extra_revision_fee numeric(12,2),
  custom_clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_usage_rights_user ON public.legal_usage_rights(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_usage_rights_quote ON public.legal_usage_rights(quotation_id) WHERE quotation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_id text NOT NULL,
  checked_items text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checklist_id)
);

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  doc_type text NOT NULL DEFAULT 'contract_draft'
    CHECK (doc_type IN ('contract_draft', 'guardian_note', 'debt_reminder')),
  title text NOT NULL,
  body text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_user ON public.legal_documents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_license_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_license_tokens_quote ON public.legal_license_tokens(quotation_id);

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS usage_rights_id uuid REFERENCES public.legal_usage_rights(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS license_certificate_path text;

CREATE INDEX IF NOT EXISTS idx_quotations_usage_rights ON public.quotations(usage_rights_id) WHERE usage_rights_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_usage_rights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_checklist_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_license_tokens TO authenticated;
GRANT ALL ON public.legal_usage_rights TO service_role;
GRANT ALL ON public.legal_checklist_progress TO service_role;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.legal_license_tokens TO service_role;

ALTER TABLE public.legal_usage_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_license_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_usage_rights_owner" ON public.legal_usage_rights
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_checklist_owner" ON public.legal_checklist_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_documents_owner" ON public.legal_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_license_tokens_owner" ON public.legal_license_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_license_tokens_public_read" ON public.legal_license_tokens
  FOR SELECT TO anon USING (expires_at IS NULL OR expires_at > now());

DROP TRIGGER IF EXISTS trg_legal_usage_rights_updated_at ON public.legal_usage_rights;
CREATE TRIGGER trg_legal_usage_rights_updated_at
  BEFORE UPDATE ON public.legal_usage_rights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_legal_documents_updated_at ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-certificates', 'legal-certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "legal-certificates owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "legal-certificates owner select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "legal-certificates owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

NOTIFY pgrst, 'reload schema';

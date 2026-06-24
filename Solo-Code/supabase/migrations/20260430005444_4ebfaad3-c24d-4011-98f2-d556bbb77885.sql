
-- ============ Suppliers ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  website TEXT,
  address TEXT,
  rate_note TEXT,
  rating SMALLINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own suppliers" ON public.suppliers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own suppliers" ON public.suppliers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_suppliers_user ON public.suppliers(user_id);

-- ============ Supplier files ============
CREATE TABLE public.supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own supplier files" ON public.supplier_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own supplier files" ON public.supplier_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own supplier files" ON public.supplier_files FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_supplier_files_supplier ON public.supplier_files(supplier_id);

-- ============ Supplier links ============
CREATE TABLE public.supplier_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own supplier links" ON public.supplier_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own supplier links" ON public.supplier_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own supplier links" ON public.supplier_links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own supplier links" ON public.supplier_links FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_supplier_links_supplier ON public.supplier_links(supplier_id);

-- ============ Quotations: debt collection fields ============
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS late_fee_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_partial NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-files', 'supplier-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners view own supplier file objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload own supplier file objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own supplier file objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

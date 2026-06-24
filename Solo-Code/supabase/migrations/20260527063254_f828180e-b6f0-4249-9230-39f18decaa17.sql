
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_suppliers_share_token ON public.suppliers(share_token) WHERE share_token IS NOT NULL;

GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.supplier_links TO anon;

CREATE POLICY "Public can view shared suppliers"
  ON public.suppliers
  FOR SELECT
  TO anon
  USING (is_shared = true AND share_token IS NOT NULL);

CREATE POLICY "Public can view links of shared suppliers"
  ON public.supplier_links
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_links.supplier_id
      AND s.is_shared = true
      AND s.share_token IS NOT NULL
  ));

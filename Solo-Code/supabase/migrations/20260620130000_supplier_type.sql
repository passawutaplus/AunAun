ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS contact_position text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_type_check'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_type_check
      CHECK (type IS NULL OR type IN ('individual', 'company'));
  END IF;
END $$;

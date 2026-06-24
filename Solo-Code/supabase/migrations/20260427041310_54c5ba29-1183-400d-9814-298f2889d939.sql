-- Extend profiles with freelancer business settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS social_link TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT;

-- Ensure brand-logos bucket exists & is public (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for brand-logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Brand logos are publicly readable'
  ) THEN
    CREATE POLICY "Brand logos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'brand-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users upload own brand logos'
  ) THEN
    CREATE POLICY "Users upload own brand logos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users update own brand logos'
  ) THEN
    CREATE POLICY "Users update own brand logos"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users delete own brand logos'
  ) THEN
    CREATE POLICY "Users delete own brand logos"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;
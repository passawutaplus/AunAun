ALTER TABLE public.tester_applications
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_line text,
  ALTER COLUMN contact_channel DROP NOT NULL,
  ALTER COLUMN contact_value DROP NOT NULL;
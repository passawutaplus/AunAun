ALTER TABLE public.collab_requests
  ADD COLUMN IF NOT EXISTS external_drive_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS other_type_note text;
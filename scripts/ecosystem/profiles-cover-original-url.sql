-- Keep full-resolution cover source so re-crop always uses the uploaded original.
-- Applied via Supabase MCP on zkflkpbmbozrchqncpzi (profiles_cover_original_url).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_original_url text;

COMMENT ON COLUMN public.profiles.cover_original_url IS
  'Uncropped cover source URL; cover_url is the cropped display banner.';

GRANT UPDATE (cover_original_url) ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

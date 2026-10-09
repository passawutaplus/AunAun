-- Public profile FAQ (settings + /@username page)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_faq jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.profile_faq IS 'Q&A shown on public profile FAQ tab — [{question, answer}]';

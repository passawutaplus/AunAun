-- Feed interest survey: cold-start personalization for Explore feed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feed_interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feed_interests_at timestamptz;

COMMENT ON COLUMN public.profiles.feed_interests IS 'Canonical project categories selected in onboarding survey (Graphic, Web/UI, …)';
COMMENT ON COLUMN public.profiles.feed_interests_at IS 'When user completed or skipped the feed interest survey';

-- Extend So1o public.profiles with an1hem showcase fields (single identity row per user).
-- So1o keys profiles by user_id; an1hem app queries .eq('user_id', auth.uid()).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_hire boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_match boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_employment_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_studio_id uuid,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_seats integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_chk
      CHECK (account_status IN ('active', 'frozen', 'under_review'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_tier_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_tier_chk
      CHECK (subscription_tier IN ('free', 'pro', 'inhouse'));
  END IF;
END $$;

-- Public read for showcase (an1hem designers directory)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile by user_id" ON public.profiles;
CREATE POLICY "Users can update own profile by user_id"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN public.profiles.user_id IS 'Auth user id — canonical key for both So1o and an1hem';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'So1o Pro unlocks both My Desk and an1hem (ecosystem)';

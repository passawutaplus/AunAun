-- LINE notification columns on unified profiles (idempotent)
-- Run on rvnzjiskqliexysicfmh if line-connect fails with "column does not exist"

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_messaging_user_id text,
  ADD COLUMN IF NOT EXISTS line_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS line_notify_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS line_notify_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

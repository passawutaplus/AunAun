-- check_user_can_post() uses ON CONFLICT (user_id) — requires unique constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_moderation_state_user_id_key'
  ) THEN
    ALTER TABLE shared.user_moderation_state
      ADD CONSTRAINT user_moderation_state_user_id_key UNIQUE (user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

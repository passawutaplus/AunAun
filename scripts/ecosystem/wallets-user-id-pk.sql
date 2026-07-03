-- shared.wallets must have one row per user — claim/topup RPCs use ON CONFLICT (user_id).

ALTER TABLE shared.wallets
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'shared.wallets'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE shared.wallets
      ADD CONSTRAINT wallets_user_id_pkey PRIMARY KEY (user_id);
  END IF;
END $$;

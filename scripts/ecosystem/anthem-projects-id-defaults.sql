-- Fix anthem.projects id/created_at defaults + primary key
-- Root cause: inserts without id produced null PK → /project/undefined after publish

UPDATE anthem.projects
SET
  id = gen_random_uuid(),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE id IS NULL;

ALTER TABLE anthem.projects
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE anthem.projects
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'anthem.projects'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE anthem.projects ADD PRIMARY KEY (id);
  END IF;
END $$;

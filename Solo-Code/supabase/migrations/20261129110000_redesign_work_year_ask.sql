-- Redesign (Upload + Work page): YEAR and ASK VIEWERS of the mock's Upload, shown again (owner 2026-11-28, Beam 49).
--   made_year   — the year the work was made (Upload "YEAR"; Work page shows it under CATEGORY).
--   ask_viewers — the owner's question to viewers (Upload "ASK VIEWERS"; Work page "<owner> อยากรู้" box).
--                 Empty = the same sentence for every work (owner 2026-11-28).
-- Rollback: supabase/manual/rollback-20261129110000_redesign_work_year_ask.sql

ALTER TABLE anthem.projects ADD COLUMN IF NOT EXISTS made_year smallint;
ALTER TABLE anthem.projects ADD COLUMN IF NOT EXISTS ask_viewers text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_made_year_check') THEN
    ALTER TABLE anthem.projects ADD CONSTRAINT projects_made_year_check CHECK (made_year BETWEEN 1900 AND 2100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_ask_viewers_check') THEN
    ALTER TABLE anthem.projects ADD CONSTRAINT projects_ask_viewers_check CHECK (char_length(ask_viewers) <= 140);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Rollback of 20261129110000_redesign_work_year_ask.sql: the two columns go (their values are lost).
ALTER TABLE anthem.projects DROP COLUMN IF EXISTS ask_viewers;
ALTER TABLE anthem.projects DROP COLUMN IF EXISTS made_year;
NOTIFY pgrst, 'reload schema';

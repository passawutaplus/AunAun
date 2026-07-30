-- Optional custom cover for Catalog / project_series
ALTER TABLE anthem.project_series
  ADD COLUMN IF NOT EXISTS cover_url text;

COMMENT ON COLUMN anthem.project_series.cover_url IS
  'Optional catalog cover; when null, UI uses project thumbs mosaic';

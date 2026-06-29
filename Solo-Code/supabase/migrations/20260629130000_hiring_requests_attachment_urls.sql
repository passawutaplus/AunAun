-- Hire brief reference images (Aplus1 invite form)
ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS attachment_urls text[];

COMMENT ON COLUMN anthem.hiring_requests.attachment_urls IS
  'Public storage URLs for reference images attached to a hire invite';

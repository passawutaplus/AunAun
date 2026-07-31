-- Link reviews to creator packages (hire from package)
ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS service_id uuid;

COMMENT ON COLUMN anthem.work_reviews.service_id IS
  'Optional creator_services id when the hire originated from a package';

CREATE INDEX IF NOT EXISTS idx_work_reviews_service_id
  ON anthem.work_reviews (service_id)
  WHERE service_id IS NOT NULL;

UPDATE anthem.work_reviews wr
SET service_id = hr.service_id
FROM anthem.hiring_requests hr
WHERE wr.hire_request_id = hr.id
  AND wr.service_id IS NULL
  AND hr.service_id IS NOT NULL;

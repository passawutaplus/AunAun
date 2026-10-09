-- Enforce copyright attestation before publishing; track attestation text version.

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS rights_attestation_version text;

COMMENT ON COLUMN anthem.projects.rights_attestation_version IS
  'Version id of legal attestation text accepted at publish (see LEGAL_ATTESTATION_VERSION)';

-- Backfill legacy published rows so the CHECK constraint can be added safely.
UPDATE anthem.projects
SET
  rights_attested_at = COALESCE(rights_attested_at, updated_at, created_at, now()),
  rights_attestation_version = COALESCE(rights_attestation_version, 'legacy-pre-enforcement')
WHERE status = 'Published'
  AND rights_attested_at IS NULL;

-- Published projects must have attestation timestamp (client + API bypass protection).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_published_requires_attestation'
  ) THEN
    ALTER TABLE anthem.projects
      ADD CONSTRAINT projects_published_requires_attestation
      CHECK (status IS DISTINCT FROM 'Published' OR rights_attested_at IS NOT NULL);
  END IF;
END $$;

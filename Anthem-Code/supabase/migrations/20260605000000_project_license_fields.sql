-- License / copyright fields on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS license_type text NOT NULL DEFAULT 'all_rights'
    CHECK (license_type IN (
      'all_rights',
      'portfolio_only',
      'personal_ok',
      'attribution_ok',
      'commercial_license',
      'custom'
    )),
  ADD COLUMN IF NOT EXISTS license_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_third_party_assets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rights_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS copyright_holder text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.projects.license_type IS 'Preset license for reuse/commercial use';
COMMENT ON COLUMN public.projects.rights_attested_at IS 'When owner confirmed they have rights to publish';

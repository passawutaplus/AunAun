-- Pipeline / Contract / Shared Squad — schema organization (idempotent)
-- Domain: Business Pipeline (quotations ↔ job_trackers ↔ finance_incomes)

-- ── Quotations: contract e-sign metadata ─────────────────────────────────────
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_signer_ip text;

COMMENT ON COLUMN public.quotations.contract_signed_at IS 'Timestamp when contract was accepted (Phase 1.5)';
COMMENT ON COLUMN public.quotations.contract_accepted IS 'Freelancer confirmed client agreement on contract template';
COMMENT ON COLUMN public.quotations.contract_signer_ip IS 'Best-effort client IP at sign time (optional)';

CREATE INDEX IF NOT EXISTS idx_quotations_contract_accepted
  ON public.quotations (user_id, contract_accepted)
  WHERE contract_accepted = true;

CREATE INDEX IF NOT EXISTS idx_quotations_pipeline_status
  ON public.quotations (user_id, status, updated_at DESC)
  WHERE status NOT IN ('rejected', 'expired');

-- ── Job trackers: pipeline link index ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation_id
  ON public.job_trackers (quotation_id)
  WHERE quotation_id IS NOT NULL;

COMMENT ON COLUMN public.job_trackers.quotation_id IS 'Links to quotations.id — Pipeline deal card';

-- ── Finance incomes: pipeline link index ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_finance_incomes_source_quotation
  ON public.finance_incomes (source_quotation_id)
  WHERE source_quotation_id IS NOT NULL;

-- ── Shared Squad (Phase 2) — grants + updated_at triggers ────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_projects') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_projects TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
    GRANT ALL ON public.shared_projects TO service_role;
    GRANT ALL ON public.project_members TO service_role;
    GRANT ALL ON public.project_tasks TO service_role;

    DROP TRIGGER IF EXISTS trg_shared_projects_updated_at ON public.shared_projects;
    CREATE TRIGGER trg_shared_projects_updated_at
      BEFORE UPDATE ON public.shared_projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
    CREATE TRIGGER trg_project_tasks_updated_at
      BEFORE UPDATE ON public.project_tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    COMMENT ON TABLE public.shared_projects IS 'Phase 2: Ad-hoc freelance squad projects (feature-gated)';
    COMMENT ON TABLE public.project_members IS 'Collaborators + revenue split % for shared_projects';
    COMMENT ON TABLE public.project_tasks IS 'Team kanban tasks within shared_projects';
  END IF;
END $$;

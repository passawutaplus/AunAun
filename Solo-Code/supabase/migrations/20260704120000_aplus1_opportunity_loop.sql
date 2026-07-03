-- P0 product loop: opportunity status (profiles) + project context fields (anthem.projects)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS opportunity_status text NOT NULL DEFAULT 'open_to_opportunities',
  ADD COLUMN IF NOT EXISTS opportunity_types text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.opportunity_status IS 'Creator availability headline: open_to_opportunities | not_available';
COMMENT ON COLUMN public.profiles.opportunity_types IS 'Opportunity type chips: paid_work, collaboration, internship, join_team, feedback_mentor, soft_open';

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS brief text,
  ADD COLUMN IF NOT EXISTS creator_role text,
  ADD COLUMN IF NOT EXISTS process_note text,
  ADD COLUMN IF NOT EXISTS deliverables text,
  ADD COLUMN IF NOT EXISTS duration_label text,
  ADD COLUMN IF NOT EXISTS outcome_note text,
  ADD COLUMN IF NOT EXISTS opportunity_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS opportunity_note text;

COMMENT ON COLUMN anthem.projects.brief IS 'Project brief / problem statement';
COMMENT ON COLUMN anthem.projects.creator_role IS 'Creator role on this project';
COMMENT ON COLUMN anthem.projects.process_note IS 'Process / approach notes';
COMMENT ON COLUMN anthem.projects.deliverables IS 'Deliverables summary';
COMMENT ON COLUMN anthem.projects.duration_label IS 'Duration label e.g. 2 weeks';
COMMENT ON COLUMN anthem.projects.outcome_note IS 'Outcome / learnings';
COMMENT ON COLUMN anthem.projects.opportunity_types IS 'Project-scoped opportunity types';
COMMENT ON COLUMN anthem.projects.opportunity_note IS 'Opportunity note tied to this project';

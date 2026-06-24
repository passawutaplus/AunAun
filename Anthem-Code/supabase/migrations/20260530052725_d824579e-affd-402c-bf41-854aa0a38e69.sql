
CREATE TYPE public.contract_type AS ENUM ('project','fulltime');
CREATE TYPE public.contract_status AS ENUM ('draft','finalized');

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.job_posts(id) ON DELETE SET NULL,
  type public.contract_type NOT NULL DEFAULT 'project',
  title text NOT NULL DEFAULT 'ร่างสัญญาจ้างงาน',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_md text NOT NULL DEFAULT '',
  status public.contract_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_user ON public.contracts(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read" ON public.contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.contracts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.contracts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.finance_tax_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'แผนภาษีของฉัน',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_tax_scenarios TO authenticated;
GRANT ALL ON public.finance_tax_scenarios TO service_role;

ALTER TABLE public.finance_tax_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tax scenarios"
ON public.finance_tax_scenarios FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tax scenarios"
ON public.finance_tax_scenarios FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tax scenarios"
ON public.finance_tax_scenarios FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tax scenarios"
ON public.finance_tax_scenarios FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_finance_tax_scenarios_user ON public.finance_tax_scenarios(user_id, updated_at DESC);

CREATE TRIGGER trg_finance_tax_scenarios_updated_at
BEFORE UPDATE ON public.finance_tax_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

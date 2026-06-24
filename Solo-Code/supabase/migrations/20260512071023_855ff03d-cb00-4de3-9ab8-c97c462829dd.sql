CREATE TABLE public.spec_checklist_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template text NOT NULL CHECK (template IN ('web','social','print')),
  checked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, template)
);

ALTER TABLE public.spec_checklist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own checklist state"
  ON public.spec_checklist_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checklist state"
  ON public.spec_checklist_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checklist state"
  ON public.spec_checklist_state FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own checklist state"
  ON public.spec_checklist_state FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_spec_checklist_state_updated_at
  BEFORE UPDATE ON public.spec_checklist_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.spec_checklist_state;
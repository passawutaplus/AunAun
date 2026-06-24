-- Add tester_approved flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tester_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tester_applied_at timestamptz;

-- Tester application table
CREATE TABLE IF NOT EXISTS public.tester_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  alias_name text,
  main_field text NOT NULL,
  main_field_other text,
  years_experience text NOT NULL,
  contact_channel text NOT NULL,
  contact_value text NOT NULL,
  quotation_method text[] NOT NULL DEFAULT '{}',
  quotation_method_other text,
  pain_points text[] NOT NULL DEFAULT '{}',
  pain_points_other text,
  feature_request text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners insert own application"
  ON public.tester_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners view own application"
  ON public.tester_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners update own application"
  ON public.tester_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all applications"
  ON public.tester_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tester_applications_updated_at
  BEFORE UPDATE ON public.tester_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an application is inserted, auto-approve the user (instant access flow)
CREATE OR REPLACE FUNCTION public.auto_approve_tester()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET tester_approved = true,
        tester_applied_at = COALESCE(tester_applied_at, now())
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tester_application_insert
  AFTER INSERT ON public.tester_applications
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_tester();
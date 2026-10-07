-- Auto-grant admin to specific email, and audit log
CREATE OR REPLACE FUNCTION public.auto_grant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_grant_admin ON public.profiles;
CREATE TRIGGER profiles_auto_grant_admin
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin();

-- Retroactively grant if profile already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'passawut.a.plus@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log"
ON public.admin_audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
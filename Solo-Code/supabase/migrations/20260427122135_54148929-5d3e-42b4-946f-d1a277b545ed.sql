
-- Hire requests inbox: when someone clicks "สนใจจ้างงาน" on a published portfolio
CREATE TABLE public.hire_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','done','archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hire_requests_owner ON public.hire_requests(owner_user_id, status, created_at DESC);
CREATE INDEX idx_hire_requests_project ON public.hire_requests(project_id);

ALTER TABLE public.hire_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a hire request, but they must specify
-- a project that exists and use its real owner — enforced via trigger below.
CREATE POLICY "Anyone can submit hire requests"
ON public.hire_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only the owner of the project can see / update / delete the requests
CREATE POLICY "Owners view their requests"
ON public.hire_requests
FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners update their requests"
ON public.hire_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete their requests"
ON public.hire_requests
FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

-- Validation trigger: ensure the owner_user_id matches the project, and project is published
CREATE OR REPLACE FUNCTION public.validate_hire_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_owner UUID;
  proj_status TEXT;
BEGIN
  SELECT user_id, status INTO real_owner, proj_status
  FROM public.portfolio_projects
  WHERE id = NEW.project_id;

  IF real_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF proj_status <> 'published' THEN
    RAISE EXCEPTION 'Cannot hire on unpublished project';
  END IF;

  -- Force owner_user_id to the real project owner regardless of what was sent
  NEW.owner_user_id := real_owner;

  -- Basic email sanity
  IF NEW.requester_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  -- Length caps to prevent spam
  IF length(NEW.requester_name) > 120 THEN
    RAISE EXCEPTION 'Name too long';
  END IF;
  IF length(NEW.message) > 4000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hire_request
BEFORE INSERT ON public.hire_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_hire_request();

-- Auto-update updated_at
CREATE TRIGGER trg_hire_requests_updated_at
BEFORE UPDATE ON public.hire_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

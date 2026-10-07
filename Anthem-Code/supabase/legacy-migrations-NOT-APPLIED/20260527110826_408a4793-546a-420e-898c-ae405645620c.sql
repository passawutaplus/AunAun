
CREATE TYPE public.collab_status AS ENUM ('pending', 'interested', 'passed', 'archived');

CREATE TABLE public.collab_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  project_id UUID,
  collab_types TEXT[] NOT NULL DEFAULT '{}',
  message TEXT NOT NULL,
  timeline TEXT,
  attached_project_ids UUID[] NOT NULL DEFAULT '{}',
  status public.collab_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_requests TO authenticated;
GRANT ALL ON public.collab_requests TO service_role;

ALTER TABLE public.collab_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or recipient can view"
  ON public.collab_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can send"
  ON public.collab_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "Recipient can update status"
  ON public.collab_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Sender can delete own request"
  ON public.collab_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

CREATE TRIGGER set_collab_requests_updated_at
  BEFORE UPDATE ON public.collab_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_collab_requests_recipient ON public.collab_requests(recipient_id, created_at DESC);
CREATE INDEX idx_collab_requests_sender ON public.collab_requests(sender_id, created_at DESC);

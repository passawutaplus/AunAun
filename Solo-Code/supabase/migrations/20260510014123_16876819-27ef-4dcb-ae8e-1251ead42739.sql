-- Guest usage tracking for anonymous landing chat
CREATE TABLE IF NOT EXISTS public.ai_chat_guest_usage (
  guest_id text NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  count integer NOT NULL DEFAULT 0,
  ip text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, usage_date)
);

ALTER TABLE public.ai_chat_guest_usage ENABLE ROW LEVEL SECURITY;

-- Only service role writes; no client policies needed (deny all by default)
CREATE POLICY "no_client_access_guest_usage"
  ON public.ai_chat_guest_usage FOR SELECT
  USING (false);

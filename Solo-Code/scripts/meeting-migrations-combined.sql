-- Meeting Capture MVP: table, storage bucket, free monthly quota, AI feature costs

CREATE TABLE IF NOT EXISTS public.meeting_captures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.saved_clients(id) ON DELETE SET NULL,
  title           text,
  source_type     text NOT NULL CHECK (source_type IN (
    'audio_upload', 'audio_record', 'video_upload', 'video_record'
  )),
  media_path      text,
  media_mime      text,
  duration_sec    integer,
  file_size_bytes bigint,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'extracting', 'ready', 'failed'
  )),
  transcript      text,
  summary_bullets text[],
  extract_result  jsonb,
  quality_score   numeric(3,2),
  brief_id        uuid REFERENCES public.design_briefs(id) ON DELETE SET NULL,
  error_message   text,
  credits_transcribe integer NOT NULL DEFAULT 0,
  credits_extract    integer NOT NULL DEFAULT 0,
  used_free_slot     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_captures_user_created_idx
  ON public.meeting_captures (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_captures TO authenticated;
GRANT ALL ON public.meeting_captures TO service_role;

ALTER TABLE public.meeting_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_captures_user_select ON public.meeting_captures;
CREATE POLICY meeting_captures_user_select ON public.meeting_captures
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_insert ON public.meeting_captures;
CREATE POLICY meeting_captures_user_insert ON public.meeting_captures
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_update ON public.meeting_captures;
CREATE POLICY meeting_captures_user_update ON public.meeting_captures
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_delete ON public.meeting_captures;
CREATE POLICY meeting_captures_user_delete ON public.meeting_captures
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_service_role ON public.meeting_captures;
CREATE POLICY meeting_captures_service_role ON public.meeting_captures
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_meeting_captures_updated_at ON public.meeting_captures;
CREATE TRIGGER trg_meeting_captures_updated_at
  BEFORE UPDATE ON public.meeting_captures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meeting_free_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year_month)
);

GRANT SELECT ON public.meeting_free_usage TO authenticated;
GRANT ALL ON public.meeting_free_usage TO service_role;
ALTER TABLE public.meeting_free_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_free_usage_user_select ON public.meeting_free_usage;
CREATE POLICY meeting_free_usage_user_select ON public.meeting_free_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_free_usage_service_role ON public.meeting_free_usage;
CREATE POLICY meeting_free_usage_service_role ON public.meeting_free_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_meeting_free_slot(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tier text;
  _ym text := to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM');
  _count integer;
BEGIN
  SELECT COALESCE(subscription_tier, 'free') INTO _tier FROM public.profiles WHERE user_id = _user_id;
  IF _tier IS DISTINCT FROM 'free' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_free_tier');
  END IF;
  INSERT INTO public.meeting_free_usage (user_id, year_month, used_count) VALUES (_user_id, _ym, 0)
  ON CONFLICT (user_id, year_month) DO NOTHING;
  SELECT used_count INTO _count FROM public.meeting_free_usage
   WHERE user_id = _user_id AND year_month = _ym FOR UPDATE;
  IF _count >= 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached');
  END IF;
  UPDATE public.meeting_free_usage SET used_count = used_count + 1, updated_at = now()
   WHERE user_id = _user_id AND year_month = _ym;
  RETURN jsonb_build_object('allowed', true, 'year_month', _ym);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_meeting_free_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meeting_free_slot(uuid) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meeting-captures', 'meeting-captures', false, 524288000,
  ARRAY['audio/mpeg','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/webm','audio/ogg','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS meeting_captures_storage_select ON storage.objects;
CREATE POLICY meeting_captures_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_insert ON storage.objects;
CREATE POLICY meeting_captures_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_update ON storage.objects;
CREATE POLICY meeting_captures_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_delete ON storage.objects;
CREATE POLICY meeting_captures_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_service ON storage.objects;
CREATE POLICY meeting_captures_storage_service ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'meeting-captures') WITH CHECK (bucket_id = 'meeting-captures');

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_meeting_transcribe_15', 3, 'Meeting â€” à¸–à¸­à¸”à¹€à¸ªà¸µà¸¢à¸‡ â‰¤15 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_transcribe_30', 4, 'Meeting â€” à¸–à¸­à¸”à¹€à¸ªà¸µà¸¢à¸‡ â‰¤30 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_transcribe_45', 5, 'Meeting â€” à¸–à¸­à¸”à¹€à¸ªà¸µà¸¢à¸‡ â‰¤45 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_transcribe_60', 6, 'Meeting â€” à¸–à¸­à¸”à¹€à¸ªà¸µà¸¢à¸‡ â‰¤60 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_brief_extract_15', 9, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸šà¸£à¸µà¸Ÿ â‰¤15 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_brief_extract_30', 14, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸šà¸£à¸µà¸Ÿ â‰¤30 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_brief_extract_45', 19, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸šà¸£à¸µà¸Ÿ â‰¤45 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_brief_extract_60', 24, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸šà¸£à¸µà¸Ÿ â‰¤60 à¸™à¸²à¸—à¸µ')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;


-- Meeting report: report_markdown, credits_report, reporting status, ai_meeting_report credits

ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS report_markdown text,
  ADD COLUMN IF NOT EXISTS credits_report integer NOT NULL DEFAULT 0;

ALTER TABLE public.meeting_captures DROP CONSTRAINT IF EXISTS meeting_captures_status_check;
ALTER TABLE public.meeting_captures ADD CONSTRAINT meeting_captures_status_check
  CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'reporting', 'extracting', 'ready', 'failed'
  ));

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_meeting_report_15', 5, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸£à¸²à¸¢à¸‡à¸²à¸™ â‰¤15 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_report_30', 7, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸£à¸²à¸¢à¸‡à¸²à¸™ â‰¤30 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_report_45', 9, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸£à¸²à¸¢à¸‡à¸²à¸™ â‰¤45 à¸™à¸²à¸—à¸µ'),
  ('ai_meeting_report_60', 10, 'Meeting â€” à¸ªà¸£à¸¸à¸›à¸£à¸²à¸¢à¸‡à¸²à¸™ â‰¤60 à¸™à¸²à¸—à¸µ')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;

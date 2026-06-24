
-- Add start_date and payment QR url to job_trackers
ALTER TABLE public.job_trackers 
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS payment_qr_url text;

-- Create public storage bucket for job tracker assets (previews, QR, slips, finals)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-tracker', 'job-tracker', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read all files in this bucket
DROP POLICY IF EXISTS "Public read job-tracker" ON storage.objects;
CREATE POLICY "Public read job-tracker" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-tracker');

-- Authenticated owners can upload to own user folder (previews/qr/finals)
DROP POLICY IF EXISTS "Owners upload job-tracker" ON storage.objects;
CREATE POLICY "Owners upload job-tracker" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners update job-tracker" ON storage.objects;
CREATE POLICY "Owners update job-tracker" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'job-tracker' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owners delete job-tracker" ON storage.objects;
CREATE POLICY "Owners delete job-tracker" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-tracker' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone (incl anonymous clients) can upload slips into slips/<job_id>/ folder
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;
CREATE POLICY "Public upload slips" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = 'slips'
  );

-- Notify job owner when client uploads a slip
CREATE OR REPLACE FUNCTION public.notify_on_slip_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
  job_title text;
  job_token uuid;
BEGIN
  SELECT user_id, title, share_token INTO owner_id, job_title, job_token
  FROM public.job_trackers WHERE id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, message, url)
  VALUES
    (owner_id, NULL, 'ลูกค้า', 'slip_uploaded',
     'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(job_title, '') || '" — กรุณาตรวจสอบ',
     '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_slip_upload ON public.job_slips;
CREATE TRIGGER trg_notify_on_slip_upload
AFTER INSERT ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.notify_on_slip_upload();

-- Allow notifications insert (system via trigger uses SECURITY DEFINER, this is just a safety net)
-- We don't add a permissive insert policy; trigger runs as definer.

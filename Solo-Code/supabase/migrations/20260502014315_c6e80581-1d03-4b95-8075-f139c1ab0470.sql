-- Enable pg_cron and pg_net (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: delete a storage object by public URL (best-effort).
-- Extracts the path part after `/storage/v1/object/public/<bucket>/`
CREATE OR REPLACE FUNCTION public.purge_old_storage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  rec RECORD;
  obj_path TEXT;
BEGIN
  -- 1) Expired announcements: delete row + banner object
  FOR rec IN
    SELECT id, banner_url
      FROM public.announcements
     WHERE end_at IS NOT NULL
       AND end_at < now() - INTERVAL '30 days'
  LOOP
    IF rec.banner_url IS NOT NULL THEN
      obj_path := regexp_replace(rec.banner_url,
        '^.*/storage/v1/object/public/announcement-banners/', '');
      IF obj_path <> rec.banner_url THEN
        DELETE FROM storage.objects
         WHERE bucket_id = 'announcement-banners' AND name = obj_path;
      END IF;
    END IF;
    DELETE FROM public.announcements WHERE id = rec.id;
  END LOOP;

  -- 2) Old chat messages (> 90 days): delete attached images then rows
  FOR rec IN
    SELECT id, image_url
      FROM public.chat_messages
     WHERE created_at < now() - INTERVAL '90 days'
       AND image_url IS NOT NULL
  LOOP
    obj_path := regexp_replace(rec.image_url,
      '^.*/storage/v1/object/public/chat-images/', '');
    IF obj_path <> rec.image_url THEN
      DELETE FROM storage.objects
       WHERE bucket_id = 'chat-images' AND name = obj_path;
    END IF;
  END LOOP;

  DELETE FROM public.chat_messages
   WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Schedule daily at 03:30 (UTC). Unschedule first if it already exists.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-old-storage-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-storage-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-old-storage-daily',
  '30 3 * * *',
  $$ SELECT public.purge_old_storage(); $$
);
-- 1. Realtime publications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_trackers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_trackers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_slips') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_slips;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_events;
  END IF;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.job_trackers REPLICA IDENTITY FULL;
ALTER TABLE public.job_slips REPLICA IDENTITY FULL;
ALTER TABLE public.job_events REPLICA IDENTITY FULL;

-- 2. Storage cleanup helpers
CREATE OR REPLACE FUNCTION public._storage_path_from_url(_url text, _bucket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _url IS NULL OR _url = '' THEN NULL
    WHEN position('/storage/v1/object/public/' || _bucket || '/' IN _url) > 0
      THEN regexp_replace(_url, '^.*/storage/v1/object/public/' || _bucket || '/', '')
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._delete_storage_object(_bucket text, _path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF _path IS NULL OR _path = '' THEN RETURN; END IF;
  DELETE FROM storage.objects WHERE bucket_id = _bucket AND name = _path;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- portfolio_projects: cover + image blocks
CREATE OR REPLACE FUNCTION public.cleanup_portfolio_project_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  block jsonb;
  url text;
BEGIN
  PERFORM public._delete_storage_object('portfolio-images',
    public._storage_path_from_url(OLD.cover, 'portfolio-images'));
  IF OLD.blocks IS NOT NULL AND jsonb_typeof(OLD.blocks) = 'array' THEN
    FOR block IN SELECT * FROM jsonb_array_elements(OLD.blocks)
    LOOP
      url := block->>'url';
      IF url IS NOT NULL THEN
        PERFORM public._delete_storage_object('portfolio-images',
          public._storage_path_from_url(url, 'portfolio-images'));
      END IF;
    END LOOP;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_portfolio_project_storage ON public.portfolio_projects;
CREATE TRIGGER trg_cleanup_portfolio_project_storage
AFTER DELETE ON public.portfolio_projects
FOR EACH ROW EXECUTE FUNCTION public.cleanup_portfolio_project_storage();

-- job_trackers
CREATE OR REPLACE FUNCTION public.cleanup_job_tracker_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.preview_image_url, 'job-tracker'));
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.final_file_url, 'job-tracker'));
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.payment_qr_url, 'job-tracker'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_job_tracker_storage ON public.job_trackers;
CREATE TRIGGER trg_cleanup_job_tracker_storage
AFTER DELETE ON public.job_trackers
FOR EACH ROW EXECUTE FUNCTION public.cleanup_job_tracker_storage();

-- job_slips
CREATE OR REPLACE FUNCTION public.cleanup_job_slip_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.slip_url, 'job-tracker'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_job_slip_storage ON public.job_slips;
CREATE TRIGGER trg_cleanup_job_slip_storage
AFTER DELETE ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.cleanup_job_slip_storage();

-- articles
CREATE OR REPLACE FUNCTION public.cleanup_article_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('article-images',
    public._storage_path_from_url(OLD.featured_image, 'article-images'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_article_storage ON public.articles;
CREATE TRIGGER trg_cleanup_article_storage
AFTER DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_article_storage();

-- chat_messages
CREATE OR REPLACE FUNCTION public.cleanup_chat_message_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('chat-images',
    public._storage_path_from_url(OLD.image_url, 'chat-images'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_chat_message_storage ON public.chat_messages;
CREATE TRIGGER trg_cleanup_chat_message_storage
AFTER DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.cleanup_chat_message_storage();

-- announcements
CREATE OR REPLACE FUNCTION public.cleanup_announcement_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('announcement-banners',
    public._storage_path_from_url(OLD.banner_url, 'announcement-banners'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_announcement_storage ON public.announcements;
CREATE TRIGGER trg_cleanup_announcement_storage
AFTER DELETE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.cleanup_announcement_storage();
-- Inbox priority for hire/collab lists (ปกติ / รอได้ / ด่วน).
-- Recipients already have UPDATE via existing participant policies.

DO $$
BEGIN
  IF to_regclass('anthem.hiring_requests') IS NOT NULL THEN
    ALTER TABLE anthem.hiring_requests
      ADD COLUMN IF NOT EXISTS inbox_priority text NOT NULL DEFAULT 'ปกติ';
    ALTER TABLE anthem.hiring_requests
      DROP CONSTRAINT IF EXISTS hiring_requests_inbox_priority_chk;
    ALTER TABLE anthem.hiring_requests
      ADD CONSTRAINT hiring_requests_inbox_priority_chk
      CHECK (inbox_priority IN ('ปกติ', 'รอได้', 'ด่วน'));
    COMMENT ON COLUMN anthem.hiring_requests.inbox_priority IS
      'Freelancer inbox priority: ปกติ | รอได้ | ด่วน';
  END IF;

  IF to_regclass('public.hiring_requests') IS NOT NULL
     AND to_regclass('public.hiring_requests') IS DISTINCT FROM to_regclass('anthem.hiring_requests') THEN
    ALTER TABLE public.hiring_requests
      ADD COLUMN IF NOT EXISTS inbox_priority text NOT NULL DEFAULT 'ปกติ';
    ALTER TABLE public.hiring_requests
      DROP CONSTRAINT IF EXISTS hiring_requests_inbox_priority_chk;
    ALTER TABLE public.hiring_requests
      ADD CONSTRAINT hiring_requests_inbox_priority_chk
      CHECK (inbox_priority IN ('ปกติ', 'รอได้', 'ด่วน'));
  END IF;

  IF to_regclass('anthem.collab_requests') IS NOT NULL THEN
    ALTER TABLE anthem.collab_requests
      ADD COLUMN IF NOT EXISTS inbox_priority text NOT NULL DEFAULT 'ปกติ';
    ALTER TABLE anthem.collab_requests
      DROP CONSTRAINT IF EXISTS collab_requests_inbox_priority_chk;
    ALTER TABLE anthem.collab_requests
      ADD CONSTRAINT collab_requests_inbox_priority_chk
      CHECK (inbox_priority IN ('ปกติ', 'รอได้', 'ด่วน'));
    COMMENT ON COLUMN anthem.collab_requests.inbox_priority IS
      'Recipient inbox priority: ปกติ | รอได้ | ด่วน';
  END IF;

  IF to_regclass('public.collab_requests') IS NOT NULL
     AND to_regclass('public.collab_requests') IS DISTINCT FROM to_regclass('anthem.collab_requests') THEN
    ALTER TABLE public.collab_requests
      ADD COLUMN IF NOT EXISTS inbox_priority text NOT NULL DEFAULT 'ปกติ';
    ALTER TABLE public.collab_requests
      DROP CONSTRAINT IF EXISTS collab_requests_inbox_priority_chk;
    ALTER TABLE public.collab_requests
      ADD CONSTRAINT collab_requests_inbox_priority_chk
      CHECK (inbox_priority IN ('ปกติ', 'รอได้', 'ด่วน'));
  END IF;
END $$;

-- Hire/collab terminal outcomes: cancel (ยกเลิก) + complete (จบงาน)
-- Hire keeps DB value ปิดแล้ว for completed; UI labels it จบงาน.
-- Safe to re-run.

ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'ยกเลิก';

ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_note text;

ALTER TABLE anthem.collab_requests
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_note text;

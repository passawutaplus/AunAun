-- Per-user toggle for collab request email notifications.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_collab boolean NOT NULL DEFAULT true;

-- Allow authenticated users to update the new column.
GRANT UPDATE (notify_collab) ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS allow_hire boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_collab boolean NOT NULL DEFAULT true;
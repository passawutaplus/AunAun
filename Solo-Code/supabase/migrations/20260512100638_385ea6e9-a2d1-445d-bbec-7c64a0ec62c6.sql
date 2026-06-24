ALTER TABLE public.vision_canvas_reactions
  ADD COLUMN IF NOT EXISTS pin_x numeric,
  ADD COLUMN IF NOT EXISTS pin_y numeric,
  ADD COLUMN IF NOT EXISTS target_block_id text;

ALTER TABLE public.vision_canvases
  ADD COLUMN IF NOT EXISTS voting_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_text text NOT NULL DEFAULT '';

-- Drop old kind CHECK constraint if exists, recreate with extended values
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.vision_canvas_reactions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%kind%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.vision_canvas_reactions DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.vision_canvas_reactions
  ADD CONSTRAINT vision_canvas_reactions_kind_check
  CHECK (kind IN ('like','comment','pin_comment','vote'));
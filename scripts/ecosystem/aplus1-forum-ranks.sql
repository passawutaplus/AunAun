-- Community helper ranks for Aplus1 forum (already applied on remote if present)
CREATE TABLE IF NOT EXISTS anthem.forum_user_ranks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rank text NOT NULL CHECK (rank IN ('helper', 'guide', 'steward')),
  title_th text NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_user_ranks_rank
  ON anthem.forum_user_ranks (rank);

ALTER TABLE anthem.forum_user_ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_user_ranks_select ON anthem.forum_user_ranks;
CREATE POLICY forum_user_ranks_select ON anthem.forum_user_ranks
  FOR SELECT TO anon, authenticated
  USING (true);

-- Writes only via admin_set_forum_rank (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.admin_set_forum_rank(
  _user_id uuid,
  _rank text DEFAULT NULL,
  _note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
DECLARE
  _title text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  IF _rank IS NULL OR _rank = '' OR _rank = 'none' THEN
    DELETE FROM anthem.forum_user_ranks WHERE user_id = _user_id;
    RETURN;
  END IF;

  IF _rank NOT IN ('helper', 'guide', 'steward') THEN
    RAISE EXCEPTION 'INVALID: rank';
  END IF;

  _title := CASE _rank
    WHEN 'helper' THEN 'ผู้ช่วยชุมชน'
    WHEN 'guide' THEN 'ไกด์ชุมชน'
    WHEN 'steward' THEN 'ดูแลชุมชน'
    ELSE _rank
  END;

  INSERT INTO anthem.forum_user_ranks (user_id, rank, title_th, granted_by, note, updated_at)
  VALUES (_user_id, _rank, _title, auth.uid(), coalesce(_note, ''), now())
  ON CONFLICT (user_id) DO UPDATE SET
    rank = EXCLUDED.rank,
    title_th = EXCLUDED.title_th,
    granted_by = EXCLUDED.granted_by,
    note = EXCLUDED.note,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_forum_rank(uuid, text, text) TO authenticated;

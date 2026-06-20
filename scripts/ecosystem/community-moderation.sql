-- Community moderation: strike contexts + audit (extends shared moderation if present).
-- Run via Supabase SQL editor or push-migration-api.

-- Ensure moderation_actions can store community contexts (no schema change if text columns exist).
COMMENT ON TABLE shared.moderation_actions IS
  'Audit log for strikes, mutes, bans. Community contexts: community_post_title, community_post_body, community_post_tag, community_comment, community_comment_reply';

-- Optional: index community-related moderation for admin dashboard
CREATE INDEX IF NOT EXISTS idx_moderation_actions_community_source
  ON shared.moderation_actions (created_at DESC)
  WHERE source LIKE 'community_%';

-- Log community post moderation events (lightweight audit)
CREATE TABLE IF NOT EXISTS anthem.community_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES anthem.community_posts(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES anthem.community_post_comments(id) ON DELETE SET NULL,
  context text NOT NULL,
  action text NOT NULL CHECK (action IN ('profanity_mask', 'profanity_block', 'spam_block', 'report', 'admin_hide')),
  snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_mod_events_user
  ON anthem.community_moderation_events (user_id, created_at DESC);

ALTER TABLE anthem.community_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_mod_events_admin ON anthem.community_moderation_events;
CREATE POLICY community_mod_events_admin
  ON anthem.community_moderation_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS community_mod_events_insert_service ON anthem.community_moderation_events;
CREATE POLICY community_mod_events_insert_service
  ON anthem.community_moderation_events FOR INSERT
  TO service_role
  WITH CHECK (true);

GRANT SELECT ON anthem.community_moderation_events TO authenticated;
GRANT ALL ON anthem.community_moderation_events TO service_role;

-- RPC: log community moderation (called from edge function or service role later)
CREATE OR REPLACE FUNCTION public.log_community_moderation_event(
  _context text,
  _action text,
  _snippet text DEFAULT NULL,
  _post_id uuid DEFAULT NULL,
  _comment_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO anthem.community_moderation_events (user_id, post_id, comment_id, context, action, snippet)
  VALUES (auth.uid(), _post_id, _comment_id, _context, _action, left(coalesce(_snippet, ''), 200));
EXCEPTION
  WHEN undefined_table THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_community_moderation_event(text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_community_moderation_event(text, text, text, uuid, uuid) TO authenticated;

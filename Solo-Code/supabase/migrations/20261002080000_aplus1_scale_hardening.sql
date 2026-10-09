-- Aplus1 scale hardening (shared prod DB zkflkpbmbozrchqncpzi)
-- 1. Chat / notification tables: primary keys, foreign keys, hot-path indexes
-- 2. Missing indexes on hiring_requests, likes, bookmarks, search columns
-- 3. RLS: dedupe projects policies, close hiring_requests client_id spoofing,
--    wrap auth.uid() / has_role() in (select ...) so they run once per query
-- 4. Fix _log_platform_event for collections (owner_id) and studios (created_by)

-- ---------------------------------------------------------------------------
-- 1. Chat tables
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'shared.conversations'::regclass AND contype = 'p') THEN
    ALTER TABLE shared.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'shared.messages'::regclass AND contype = 'p') THEN
    ALTER TABLE shared.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'shared.notifications'::regclass AND contype = 'p') THEN
    ALTER TABLE shared.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_fkey' AND conrelid = 'shared.messages'::regclass) THEN
    ALTER TABLE shared.messages
      ADD CONSTRAINT messages_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES shared.conversations (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE shared.messages VALIDATE CONSTRAINT messages_conversation_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_members_conversation_id_fkey' AND conrelid = 'shared.conversation_members'::regclass) THEN
    ALTER TABLE shared.conversation_members
      ADD CONSTRAINT conversation_members_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES shared.conversations (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE shared.conversation_members VALIDATE CONSTRAINT conversation_members_conversation_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_hides_conversation_id_fkey' AND conrelid = 'shared.conversation_hides'::regclass) THEN
    ALTER TABLE shared.conversation_hides
      ADD CONSTRAINT conversation_hides_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES shared.conversations (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE shared.conversation_hides VALIDATE CONSTRAINT conversation_hides_conversation_id_fkey;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON shared.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON shared.messages (conversation_id, sender_id) WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON shared.messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_client_last
  ON shared.conversations (client_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_freelancer_last
  ON shared.conversations (freelancer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by
  ON shared.conversations (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_request
  ON shared.conversations (kind, request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON shared.conversation_members (user_id, conversation_id);

-- ---------------------------------------------------------------------------
-- 2. Hot lookup indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hiring_freelancer_created
  ON anthem.hiring_requests (freelancer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hiring_client_created
  ON anthem.hiring_requests (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hiring_forwarded_from
  ON anthem.hiring_requests (forwarded_from_request_id) WHERE forwarded_from_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_likes_user_created
  ON anthem.project_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_user_created
  ON anthem.project_bookmarks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm
  ON anthem.projects USING gin (title public.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

-- projects: 11 overlapping policies -> 4, same effective access
DROP POLICY IF EXISTS "Owners can delete" ON anthem.projects;
DROP POLICY IF EXISTS "Owners can insert" ON anthem.projects;
DROP POLICY IF EXISTS "Owners can update" ON anthem.projects;
DROP POLICY IF EXISTS "Owners delete own projects" ON anthem.projects;
DROP POLICY IF EXISTS "Owners insert own projects" ON anthem.projects;
DROP POLICY IF EXISTS "Owners update own projects" ON anthem.projects;
DROP POLICY IF EXISTS "Owners view own projects" ON anthem.projects;
DROP POLICY IF EXISTS "Public can view published projects" ON anthem.projects;
DROP POLICY IF EXISTS "Published projects are public" ON anthem.projects;
DROP POLICY IF EXISTS "projects owner delete" ON anthem.projects;
DROP POLICY IF EXISTS "projects owner update" ON anthem.projects;
DROP POLICY IF EXISTS projects_select ON anthem.projects;
DROP POLICY IF EXISTS projects_insert ON anthem.projects;
DROP POLICY IF EXISTS projects_update ON anthem.projects;
DROP POLICY IF EXISTS projects_delete ON anthem.projects;

CREATE POLICY projects_select ON anthem.projects FOR SELECT TO public
  USING (
    status = 'Published'
    OR owner_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );
CREATE POLICY projects_insert ON anthem.projects FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );
CREATE POLICY projects_update ON anthem.projects FOR UPDATE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );
CREATE POLICY projects_delete ON anthem.projects FOR DELETE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );

-- hiring_requests: "auth.uid() IS NOT NULL" let any user insert with someone else's client_id.
-- Allowed inserts: own request (freelancer or studio target) or a forward by the source freelancer.
DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
DROP POLICY IF EXISTS "Clients can create their own requests" ON anthem.hiring_requests;
DROP POLICY IF EXISTS "Freelancer or admin can view requests" ON anthem.hiring_requests;
DROP POLICY IF EXISTS hiring_requests_insert ON anthem.hiring_requests;

CREATE POLICY hiring_requests_insert ON anthem.hiring_requests FOR INSERT TO authenticated
  WITH CHECK (
    (freelancer_id IS NULL OR client_id IS DISTINCT FROM freelancer_id)
    AND (
      client_id = (SELECT auth.uid())
      OR (
        forwarded_from_request_id IS NOT NULL
        AND anthem.is_hiring_request_freelancer(forwarded_from_request_id, (SELECT auth.uid()))
      )
    )
  );

ALTER POLICY "Anyone can view requests" ON anthem.hiring_requests
  USING (
    freelancer_id = (SELECT auth.uid())
    OR client_id = (SELECT auth.uid())
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );

-- notifications, likes, bookmarks
ALTER POLICY "notifications own read" ON shared.notifications USING (user_id = (SELECT auth.uid()));
ALTER POLICY "notifications own update" ON shared.notifications USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can like" ON anthem.project_likes WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can unlike" ON anthem.project_likes USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own bookmarks" ON anthem.project_bookmarks WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can delete own bookmarks" ON anthem.project_bookmarks USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Platform event logger: collections/studios referenced non-existent columns,
--    which made every collection and studio insert fail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._log_platform_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'anthem', 'shared'
AS $function$
DECLARE
  v_type text := TG_ARGV[0];
  v_actor uuid;
  v_target_type text := NULLIF(TG_ARGV[1], '');
  v_target_id uuid;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      v_actor := COALESCE(NEW.user_id, NEW.id);
      v_meta := jsonb_build_object('display_name', NEW.display_name, 'username', NEW.username);
    WHEN 'projects' THEN
      v_actor := NEW.owner_id; v_target_type := 'project'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    WHEN 'project_likes' THEN
      v_actor := NEW.user_id; v_target_type := 'project'; v_target_id := NEW.project_id;
    WHEN 'project_comments' THEN
      v_actor := NEW.user_id; v_target_type := 'project'; v_target_id := NEW.project_id;
      v_meta := jsonb_build_object('content', left(NEW.content, 200));
    WHEN 'follows' THEN
      v_actor := NEW.follower_id; v_target_type := 'user'; v_target_id := NEW.following_id;
    WHEN 'hiring_requests' THEN
      v_actor := NEW.client_id; v_target_type := 'project';
      BEGIN
        v_target_id := NULLIF(NEW.project_id::text, '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_target_id := NULL;
      END;
      v_meta := jsonb_build_object('project_title', NEW.project_title, 'client_name', NEW.client_name, 'status', NEW.status, 'project_ref', NEW.project_id);
    WHEN 'collab_requests' THEN
      v_actor := NEW.sender_id; v_target_type := 'user'; v_target_id := NEW.recipient_id;
      v_meta := jsonb_build_object('message', left(COALESCE(NEW.message, ''), 200), 'status', NEW.status);
    WHEN 'job_posts' THEN
      v_actor := NEW.posted_by; v_target_type := 'job'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    WHEN 'job_applications' THEN
      v_actor := NEW.applicant_id; v_target_type := 'job'; v_target_id := NEW.job_id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'gift_transactions' THEN
      v_actor := NEW.sender_id; v_target_type := 'user'; v_target_id := NEW.recipient_id;
      v_meta := jsonb_build_object('price_px', NEW.price_px, 'gift_id', NEW.gift_id, 'project_id', NEW.project_id);
    WHEN 'app_feedback' THEN
      v_actor := NEW.user_id; v_target_type := 'feedback'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('feature', NEW.feature, 'rating', NEW.rating, 'status', NEW.status);
    WHEN 'cashout_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'cashout'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('gross_px', NEW.gross_px, 'status', NEW.status);
    WHEN 'kyc_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'kyc'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'messages' THEN
      v_actor := NEW.sender_id; v_target_type := 'conversation'; v_target_id := NEW.conversation_id;
      v_meta := jsonb_build_object('content', left(COALESCE(NEW.content, ''), 120));
    WHEN 'collections' THEN
      v_actor := NEW.owner_id; v_target_type := 'collection'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name);
    WHEN 'studios' THEN
      v_actor := NEW.created_by; v_target_type := 'studio'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name, 'slug', NEW.slug);
    ELSE
      v_meta := '{}'::jsonb;
  END CASE;

  INSERT INTO public.platform_events(event_type, actor_id, target_type, target_id, metadata)
  VALUES (v_type, v_actor, v_target_type, v_target_id, v_meta);
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Chat read RPCs (SECURITY INVOKER: RLS still applies)
--    chat_last_messages: newest message per conversation (sidebar previews)
--    chat_unread_count:  header badge in one round trip
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_last_messages(conv_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  content text,
  attachment_url text,
  sender_id uuid,
  created_at timestamptz,
  message_type text,
  deleted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT m.conversation_id, m.content, m.attachment_url, m.sender_id, m.created_at, m.message_type, m.deleted_at
  FROM unnest(conv_ids[1:300]) AS c(id)
  CROSS JOIN LATERAL (
    SELECT * FROM shared.messages x
    WHERE x.conversation_id = c.id
    ORDER BY x.created_at DESC
    LIMIT 1
  ) m;
$$;

CREATE OR REPLACE FUNCTION public.chat_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  convs AS (
    SELECT c.id FROM shared.conversations c, me
    WHERE c.client_id = me.uid OR c.freelancer_id = me.uid
    UNION
    SELECT cm.conversation_id FROM shared.conversation_members cm, me
    WHERE cm.user_id = me.uid
  )
  SELECT count(*)::int
  FROM shared.messages m, me
  WHERE m.conversation_id IN (SELECT id FROM convs)
    AND m.read_at IS NULL
    AND m.deleted_at IS NULL
    AND m.sender_id <> me.uid;
$$;

REVOKE ALL ON FUNCTION public.chat_last_messages(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.chat_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_last_messages(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_unread_count() TO authenticated;


-- ---------------------------------------------------------------------------
-- 6. Missing primary keys / unique keys on hot Anthem tables.
--    Without them likes and follows can duplicate, upsert(onConflict) fails,
--    and every lookup scans the table (has_role() reads user_roles in most RLS).
-- ---------------------------------------------------------------------------
DELETE FROM anthem.image_likes a
USING anthem.image_likes b
WHERE a.ctid > b.ctid
  AND a.user_id = b.user_id
  AND a.project_id = b.project_id
  AND a.image_url = b.image_url;

DO $$
DECLARE
  spec text[];
  specs text[][] := ARRAY[
    ARRAY['anthem.follows',                  'follower_id, following_id'],
    ARRAY['anthem.project_comments',         'id'],
    ARRAY['anthem.collections',              'id'],
    ARRAY['anthem.inspire_boards',           'id'],
    ARRAY['anthem.inspire_items',            'id'],
    ARRAY['anthem.image_likes',              'user_id, project_id, image_url'],
    ARRAY['anthem.image_shares',             'id'],
    ARRAY['anthem.community_post_likes',     'post_id, user_id'],
    ARRAY['anthem.community_post_bookmarks', 'post_id, user_id'],
    ARRAY['anthem.community_post_views',     'id'],
    ARRAY['anthem.user_blocks',              'blocker_id, blocked_id'],
    ARRAY['public.profiles',                 'id'],
    ARRAY['public.user_roles',               'id'],
    ARRAY['public.platform_events',          'id']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = spec[1]::regclass AND contype = 'p') THEN
      EXECUTE format('ALTER TABLE %s ADD PRIMARY KEY (%s)', spec[1], spec[2]);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_key ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_follows_following_created ON anthem.follows (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_owner ON anthem.collections (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_project ON anthem.collection_items (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspire_boards_owner ON anthem.inspire_boards (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_likes_project_image ON anthem.image_likes (project_id, image_url);
CREATE INDEX IF NOT EXISTS idx_image_shares_project_image ON anthem.image_shares (project_id, image_url);
CREATE INDEX IF NOT EXISTS idx_cp_likes_user ON anthem.community_post_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_bookmarks_user ON anthem.community_post_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_views_post ON anthem.community_post_views (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON anthem.user_blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- 7. Batch summaries for card grids (one call per page instead of per card)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_like_summary(ids uuid[])
RETURNS TABLE (project_id uuid, likes integer, liked boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT i.id,
    (SELECT count(*) FROM anthem.project_likes l WHERE l.project_id = i.id)::int,
    EXISTS (SELECT 1 FROM anthem.project_likes l WHERE l.project_id = i.id AND l.user_id = (SELECT auth.uid()))
  FROM unnest(ids[1:300]) AS i(id);
$$;

CREATE OR REPLACE FUNCTION public.follow_summary(ids uuid[])
RETURNS TABLE (user_id uuid, followers integer, following integer, is_following boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT i.id,
    (SELECT count(*) FROM anthem.follows f WHERE f.following_id = i.id)::int,
    (SELECT count(*) FROM anthem.follows f WHERE f.follower_id = i.id)::int,
    EXISTS (SELECT 1 FROM anthem.follows f WHERE f.follower_id = (SELECT auth.uid()) AND f.following_id = i.id)
  FROM unnest(ids[1:300]) AS i(id);
$$;

GRANT EXECUTE ON FUNCTION public.project_like_summary(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.follow_summary(uuid[]) TO anon, authenticated;


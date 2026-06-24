-- Anthem → unified project rvnzjiskqliexysicfmh
-- Generated: 2026-06-07T11:38:16.415Z
-- Run AFTER 20260606120000 + 20260606120100 + 20260606120200
-- Dashboard SQL Editor or: ./scripts/supabase-push-via-api.sh

-- ── 20260504050330_f2b8f8c6-857f-4fb4-aa93-b2c452f538dc.sql ──

-- ENUMS
DO $enum$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.hire_budget AS ENUM ('1k-5k', '5k-20k', '20k-50k', '50k+'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.hire_status AS ENUM ('ใหม่', 'ที่ต้องตอบ', 'ติดต่อแล้ว', 'ปิดแล้ว'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

-- updated_at helper
CREATE OR REPLACE FUNCTION anthem.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
-- SKIP unified public.profiles
-- -- SKIP CREATE public.profiles
-- CREATE TABLE public.profiles (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   display_name TEXT NOT NULL DEFAULT '',
--   username TEXT UNIQUE,
--   bio TEXT DEFAULT '',
--   role TEXT DEFAULT '',
--   email TEXT,
--   phone TEXT DEFAULT '',
--   website TEXT DEFAULT '',
--   line_id TEXT DEFAULT '',
--   facebook TEXT DEFAULT '',
--   instagram TEXT DEFAULT '',
--   avatar_url TEXT,
--   notify_email BOOLEAN NOT NULL DEFAULT true,
--   notify_hire BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- -- CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();
-- 
-- -- CREATE POLICY "Profiles are viewable by everyone"
--   ON public.profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can insert their own profile"
--   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own profile"
--   ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
-- 
-- USER ROLES
-- SKIP unified public.user_roles
-- -- SKIP CREATE public.user_roles
-- CREATE TABLE public.user_roles (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   role public.app_role NOT NULL DEFAULT 'user',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   UNIQUE(user_id, role)
-- );
-- ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE OR REPLACE FUNCTION anthem.has_role(_user_id UUID, _role public.app_role)
-- RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
--   SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
-- $$;
-- 
-- CREATE POLICY "Users can view their own roles"
--   ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
-- CREATE POLICY "Admins can manage roles"
--   ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- HIRING REQUESTS
CREATE TABLE anthem.hiring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id TEXT,
  project_title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  budget public.hire_budget NOT NULL,
  deadline TEXT,
  message TEXT NOT NULL,
  status public.hire_status NOT NULL DEFAULT 'ใหม่',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE anthem.hiring_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hiring_requests_updated BEFORE UPDATE ON anthem.hiring_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

CREATE POLICY "Freelancer or admin can view requests"
  ON anthem.hiring_requests FOR SELECT
  USING (auth.uid() = freelancer_id OR auth.uid() = client_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create requests"
  ON anthem.hiring_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Freelancer can update their requests"
  ON anthem.hiring_requests FOR UPDATE
  USING (auth.uid() = freelancer_id);
CREATE POLICY "Freelancer can delete their requests"
  ON anthem.hiring_requests FOR DELETE
  USING (auth.uid() = freelancer_id);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION anthem.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION anthem.handle_new_user();

-- REALTIME
ALTER TABLE anthem.hiring_requests REPLICA IDENTITY FULL;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.hiring_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;


-- ── 20260504050402_09e8597e-c784-45f0-83e6-d9810d40f73e.sql ──

ALTER FUNCTION anthem.set_updated_at() SET search_path = anthem, shared, public;
REVOKE EXECUTE ON FUNCTION anthem.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anthem.set_updated_at() FROM PUBLIC, anon, authenticated;


-- ── 20260504053038_9cb862fc-77b2-4d14-9f9e-cd1472aebe8f.sql ──

-- Projects table
CREATE TABLE anthem.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  subtitle text DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL,
  cover_url text DEFAULT '',
  gallery_urls text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  price_thb integer,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Published','Draft','Private')),
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published projects"
  ON anthem.projects FOR SELECT
  USING (status = 'Published' OR auth.uid() = owner_id);

CREATE POLICY "Owners can insert"
  ON anthem.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update"
  ON anthem.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete"
  ON anthem.projects FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

CREATE INDEX idx_projects_owner ON anthem.projects(owner_id);
CREATE INDEX idx_projects_status_created ON anthem.projects(status, created_at DESC);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('project-media', 'project-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');

CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── 20260504053111_3e916dd7-ea03-419a-a2b6-e4e88bd04195.sql ──
DROP POLICY IF EXISTS "Project media public read" ON storage.objects;

-- ── 20260527103624_1ccf8c72-b804-4466-baba-a0e4718853b7.sql ──
-- 1. Make hiring_requests.budget optional and add numeric budget_amount
ALTER TABLE anthem.hiring_requests
  ALTER COLUMN budget DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS budget_amount integer NULL;

-- Make message optional too
ALTER TABLE anthem.hiring_requests
  ALTER COLUMN message DROP NOT NULL;

-- 2. project_comments
CREATE TABLE anthem.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_comments_project ON anthem.project_comments(project_id, created_at DESC);

GRANT SELECT ON anthem.project_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.project_comments TO authenticated;
GRANT ALL ON anthem.project_comments TO service_role;

ALTER TABLE anthem.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON anthem.project_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their comments"
  ON anthem.project_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments"
  ON anthem.project_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON anthem.project_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_project_comments_updated_at
  BEFORE UPDATE ON anthem.project_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.project_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- 3. follows
CREATE TABLE anthem.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_following ON anthem.follows(following_id);

GRANT SELECT ON anthem.follows TO anon;
GRANT SELECT, INSERT, DELETE ON anthem.follows TO authenticated;
GRANT ALL ON anthem.follows TO service_role;

ALTER TABLE anthem.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON anthem.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others"
  ON anthem.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON anthem.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ── 20260527105501_0af486c3-cdd6-4f81-b5ec-cdce0b5836ba.sql ──
-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb,
--   ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
--   ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT '';

-- ── 20260527110041_d93fb457-a413-4592-9c47-17ed34a77e00.sql ──

CREATE TABLE anthem.project_bookmarks (
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON anthem.project_bookmarks TO anon;
GRANT SELECT, INSERT, DELETE ON anthem.project_bookmarks TO authenticated;
GRANT ALL ON anthem.project_bookmarks TO service_role;
ALTER TABLE anthem.project_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookmarks viewable by everyone" ON anthem.project_bookmarks FOR SELECT USING (true);
CREATE POLICY "Users can insert own bookmarks" ON anthem.project_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON anthem.project_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE anthem.project_likes (
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON anthem.project_likes TO anon;
GRANT SELECT, INSERT, DELETE ON anthem.project_likes TO authenticated;
GRANT ALL ON anthem.project_likes TO service_role;
ALTER TABLE anthem.project_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone" ON anthem.project_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON anthem.project_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON anthem.project_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 20260527110826_408a4793-546a-420e-898c-ae405645620c.sql ──

DO $enum$ BEGIN CREATE TYPE public.collab_status AS ENUM ('pending', 'interested', 'passed', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

CREATE TABLE anthem.collab_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  project_id UUID,
  collab_types TEXT[] NOT NULL DEFAULT '{}',
  message TEXT NOT NULL,
  timeline TEXT,
  attached_project_ids UUID[] NOT NULL DEFAULT '{}',
  status public.collab_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.collab_requests TO authenticated;
GRANT ALL ON anthem.collab_requests TO service_role;

ALTER TABLE anthem.collab_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or recipient can view"
  ON anthem.collab_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can send"
  ON anthem.collab_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "Recipient can update status"
  ON anthem.collab_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Sender can delete own request"
  ON anthem.collab_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

CREATE TRIGGER set_collab_requests_updated_at
  BEFORE UPDATE ON anthem.collab_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

CREATE INDEX idx_collab_requests_recipient ON anthem.collab_requests(recipient_id, created_at DESC);
CREATE INDEX idx_collab_requests_sender ON anthem.collab_requests(sender_id, created_at DESC);


-- ── 20260527111621_914a4f28-9d51-4a46-9904-b0daf9f9c6b6.sql ──

-- 1. Hide email/phone from anon on profiles (authenticated users still see contact info for marketplace use)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, display_name, username, bio, role, website, line_id, facebook, instagram,
  avatar_url, cover_url, skills, experience, location, created_at, updated_at
) ON public.profiles TO anon;

-- 2. Remove hiring_requests from realtime publication (PII)
ALTER PUBLICATION supabase_realtime DROP TABLE public.hiring_requests;

-- 3. Tighten hiring_requests INSERT policy to authenticated role
DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
CREATE POLICY "Authenticated users can create requests"
  ON anthem.hiring_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add explicit SELECT policy on project-media storage bucket (documents intentional public access)
CREATE POLICY "project-media is publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-media');

-- 5. Restrict has_role EXECUTE — anon cannot call it (no anon RLS policy uses it)
REVOKE EXECUTE ON FUNCTION anthem.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION anthem.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION anthem.has_role(uuid, public.app_role) TO authenticated, service_role;


-- ── 20260527111651_c52f25a6-e1fc-4a14-add9-36bcc41fd2c4.sql ──

DROP POLICY IF EXISTS "project-media is publicly readable" ON storage.objects;


-- ── 20260528102523_e3d63ff0-2f77-4f5c-ae82-ff05e9492aa8.sql ──
CREATE TABLE anthem.project_views (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.project_views TO authenticated;
GRANT ALL ON anthem.project_views TO service_role;

ALTER TABLE anthem.project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own view history"
  ON anthem.project_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own view history"
  ON anthem.project_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own view history"
  ON anthem.project_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own view history"
  ON anthem.project_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_project_views_user_viewed ON anthem.project_views (user_id, viewed_at DESC);
CREATE INDEX idx_project_views_project ON anthem.project_views (project_id);

-- ── 20260528104002_65cf5952-8d36-474d-89fa-8a308340d91b.sql ──

-- 1) Extend enums
ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'ตอบรับ';
ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'ปฏิเสธ';
ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'declined';

-- 2) Conversations
CREATE TABLE shared.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('hire','collab')),
  request_id uuid NOT NULL,
  client_id uuid NOT NULL,
  freelancer_id uuid NOT NULL,
  project_id uuid,
  project_title text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, request_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversations TO authenticated;
GRANT ALL ON shared.conversations TO service_role;

ALTER TABLE shared.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Participants can create conversations"
  ON shared.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Participants can update conversations"
  ON shared.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE INDEX idx_conversations_freelancer ON shared.conversations(freelancer_id, last_message_at DESC);
CREATE INDEX idx_conversations_client ON shared.conversations(client_id, last_message_at DESC);

-- 3) Messages
CREATE TABLE shared.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.messages TO authenticated;
GRANT ALL ON shared.messages TO service_role;

ALTER TABLE shared.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON shared.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
  ));

CREATE POLICY "Participants can send messages"
  ON shared.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
    )
  );

CREATE POLICY "Recipient can mark as read"
  ON shared.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
  ));

CREATE INDEX idx_messages_conv_time ON shared.messages(conversation_id, created_at);

-- 4) Realtime
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
ALTER TABLE shared.conversations REPLICA IDENTITY FULL;
ALTER TABLE shared.messages REPLICA IDENTITY FULL;


-- ── 20260528111047_7cfc8565-fa00-4271-b9b2-e054a6adf664.sql ──

-- 1) Collections table
CREATE TABLE anthem.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON anthem.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.collections TO authenticated;
GRANT ALL ON anthem.collections TO service_role;

ALTER TABLE anthem.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public collections visible to all"
  ON anthem.collections FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Owners insert their collections"
  ON anthem.collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update their collections"
  ON anthem.collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete their collections"
  ON anthem.collections FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX idx_collections_owner ON anthem.collections(owner_id);

CREATE TRIGGER set_collections_updated_at
BEFORE UPDATE ON anthem.collections
FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

-- 2) Collection items
CREATE TABLE anthem.collection_items (
  collection_id uuid NOT NULL REFERENCES anthem.collections(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, project_id)
);

GRANT SELECT ON anthem.collection_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.collection_items TO authenticated;
GRANT ALL ON anthem.collection_items TO service_role;

ALTER TABLE anthem.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items visible if parent collection visible"
  ON anthem.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id
      AND (c.is_public = true OR c.owner_id = auth.uid())
  ));

CREATE POLICY "Owners can add items to their collection"
  ON anthem.collection_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can remove items from their collection"
  ON anthem.collection_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = auth.uid()
  ));

CREATE INDEX idx_collection_items_project ON anthem.collection_items(project_id);

-- 3) Trigger to maintain item_count
CREATE OR REPLACE FUNCTION anthem.update_collection_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.collections
      SET item_count = item_count + 1, updated_at = now()
      WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.collections
      SET item_count = GREATEST(item_count - 1, 0), updated_at = now()
      WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_collection_items_count
AFTER INSERT OR DELETE ON anthem.collection_items
FOR EACH ROW EXECUTE FUNCTION anthem.update_collection_item_count();

-- 4) Migrate existing bookmarks into a default "My Collection" per user
DO $$
DECLARE
  rec record;
  cid uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM public.project_bookmarks
  LOOP
    INSERT INTO public.collections (owner_id, name, description, is_public)
    VALUES (rec.user_id, 'My Collection', 'ผลงานที่ฉันบันทึกไว้', true)
    RETURNING id INTO cid;

    INSERT INTO public.collection_items (collection_id, project_id, added_at)
    SELECT cid, pb.project_id, pb.created_at
    FROM public.project_bookmarks pb
    WHERE pb.user_id = rec.user_id
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;


-- ── 20260528142429_8e45b426-f12e-4d2c-ba6c-09272f0dba30.sql ──
CREATE OR REPLACE FUNCTION anthem.increment_project_view(_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  UPDATE public.projects
  SET views = views + 1
  WHERE id = _project_id AND status = 'Published';
$$;

GRANT EXECUTE ON FUNCTION anthem.increment_project_view(uuid) TO anon, authenticated;

-- ── 20260529042459_6c76d714-9034-4fe5-af9b-465645c1f3e2.sql ──
ALTER TABLE anthem.projects
ADD COLUMN IF NOT EXISTS allow_hire boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_collab boolean NOT NULL DEFAULT true;

-- ── 20260529044137_c29b7f2f-d5cd-48db-b2cd-ee51a4d0030c.sql ──

-- 1. Restrict profile PII columns from anonymous users
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, username, bio, role, location, cover_url, avatar_url, website, instagram, facebook, skills, experience, created_at, updated_at)
  ON public.profiles TO anon;

-- 2. hiring_requests: enforce client_id ownership on insert
DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
CREATE POLICY "Clients can create their own requests"
ON anthem.hiring_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id AND client_id <> freelancer_id);

-- 3. project_bookmarks: restrict reads to owner of bookmark or owner of project
DROP POLICY IF EXISTS "Bookmarks viewable by everyone" ON anthem.project_bookmarks;
CREATE POLICY "Bookmarks visible to owner or project owner"
ON anthem.project_bookmarks
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- 4. project_likes: same scoping
DROP POLICY IF EXISTS "Likes viewable by everyone" ON anthem.project_likes;
CREATE POLICY "Likes visible to owner or project owner"
ON anthem.project_likes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- 5. Revoke anon execute on increment_project_view RPC (prevent unauth metric manipulation)
REVOKE EXECUTE ON FUNCTION anthem.increment_project_view(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.increment_project_view(uuid) TO authenticated;

-- 6. Lock down has_role to authenticated only
REVOKE EXECUTE ON FUNCTION anthem.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.has_role(uuid, app_role) TO authenticated;


-- ── 20260529045820_a2269dcf-aea4-4707-9ffe-6faad1333cc6.sql ──

-- ========== ENUMS ==========
DO $enum$ BEGIN CREATE TYPE public.studio_member_role AS ENUM ('owner', 'admin', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.studio_formation_status AS ENUM ('pending', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.studio_invite_status AS ENUM ('pending', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.job_status AS ENUM ('open', 'closed', 'filled'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.job_budget_type AS ENUM ('fixed', 'hourly', 'monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.job_location_type AS ENUM ('remote', 'onsite', 'hybrid'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.job_application_status AS ENUM ('pending', 'shortlisted', 'rejected', 'accepted'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

-- ========== PROFILE / PROJECT ADDITIONS ==========
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_studio_id uuid;
ALTER TABLE anthem.projects ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE anthem.projects ADD COLUMN IF NOT EXISTS credited_user_ids uuid[] NOT NULL DEFAULT '{}';

-- ========== STUDIOS ==========
CREATE TABLE anthem.studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON anthem.studios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.studios TO authenticated;
GRANT ALL ON anthem.studios TO service_role;
ALTER TABLE anthem.studios ENABLE ROW LEVEL SECURITY;

-- ========== STUDIO MEMBERS ==========
CREATE TABLE anthem.studio_members (
  studio_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.studio_member_role NOT NULL DEFAULT 'member',
  credit_title text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id, user_id)
);
GRANT SELECT ON anthem.studio_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.studio_members TO authenticated;
GRANT ALL ON anthem.studio_members TO service_role;
ALTER TABLE anthem.studio_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursion
CREATE OR REPLACE FUNCTION anthem.is_studio_member(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = _studio_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION anthem.is_studio_admin(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = _studio_id AND user_id = _user_id AND role IN ('owner','admin'))
$$;

REVOKE EXECUTE ON FUNCTION anthem.is_studio_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.is_studio_member(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION anthem.is_studio_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.is_studio_admin(uuid, uuid) TO authenticated, service_role;

-- Studios policies
CREATE POLICY "Studios are viewable by everyone" ON anthem.studios FOR SELECT USING (true);
CREATE POLICY "Authenticated can create studios" ON anthem.studios FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Studio admins can update" ON anthem.studios FOR UPDATE TO authenticated USING (public.is_studio_admin(id, auth.uid()));
CREATE POLICY "Studio owners can delete" ON anthem.studios FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = studios.id AND user_id = auth.uid() AND role = 'owner')
);

-- Studio members policies (members visible publicly for studio profile page)
CREATE POLICY "Studio members are viewable by everyone" ON anthem.studio_members FOR SELECT USING (true);
CREATE POLICY "Studio admins can add members" ON anthem.studio_members FOR INSERT TO authenticated WITH CHECK (
  public.is_studio_admin(studio_id, auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "Studio admins can update members" ON anthem.studio_members FOR UPDATE TO authenticated USING (
  public.is_studio_admin(studio_id, auth.uid())
);
CREATE POLICY "Members can leave or admins remove" ON anthem.studio_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_studio_admin(studio_id, auth.uid())
);

-- ========== STUDIO FORMATION ==========
CREATE TABLE anthem.studio_formation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL,
  proposed_name text NOT NULL,
  proposed_slug text NOT NULL,
  proposed_tagline text NOT NULL DEFAULT '',
  status public.studio_formation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_studio_id uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.studio_formation_requests TO authenticated;
GRANT ALL ON anthem.studio_formation_requests TO service_role;
ALTER TABLE anthem.studio_formation_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE anthem.studio_formation_invites (
  formation_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status public.studio_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  PRIMARY KEY (formation_id, invitee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.studio_formation_invites TO authenticated;
GRANT ALL ON anthem.studio_formation_invites TO service_role;
ALTER TABLE anthem.studio_formation_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION anthem.is_formation_participant(_formation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_formation_requests r
    WHERE r.id = _formation_id AND (r.founder_id = _user_id OR EXISTS (
      SELECT 1 FROM public.studio_formation_invites i WHERE i.formation_id = _formation_id AND i.invitee_id = _user_id
    ))
  )
$$;
REVOKE EXECUTE ON FUNCTION anthem.is_formation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.is_formation_participant(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Founder or invitee can view formation" ON anthem.studio_formation_requests FOR SELECT TO authenticated USING (
  founder_id = auth.uid() OR public.is_formation_participant(id, auth.uid())
);
CREATE POLICY "Founder creates formation" ON anthem.studio_formation_requests FOR INSERT TO authenticated WITH CHECK (founder_id = auth.uid());
CREATE POLICY "Founder updates formation" ON anthem.studio_formation_requests FOR UPDATE TO authenticated USING (founder_id = auth.uid());
CREATE POLICY "Founder deletes formation" ON anthem.studio_formation_requests FOR DELETE TO authenticated USING (founder_id = auth.uid());

CREATE POLICY "Participants view invites" ON anthem.studio_formation_invites FOR SELECT TO authenticated USING (
  invitee_id = auth.uid() OR public.is_formation_participant(formation_id, auth.uid())
);
CREATE POLICY "Founder creates invites" ON anthem.studio_formation_invites FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.studio_formation_requests r WHERE r.id = formation_id AND r.founder_id = auth.uid())
);
CREATE POLICY "Invitee updates own invite" ON anthem.studio_formation_invites FOR UPDATE TO authenticated USING (invitee_id = auth.uid());
CREATE POLICY "Founder or invitee deletes" ON anthem.studio_formation_invites FOR DELETE TO authenticated USING (
  invitee_id = auth.uid() OR EXISTS (SELECT 1 FROM public.studio_formation_requests r WHERE r.id = formation_id AND r.founder_id = auth.uid())
);

-- Trigger: when all invites accepted, create studio
CREATE OR REPLACE FUNCTION anthem.complete_studio_formation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  v_pending int;
  v_declined int;
  v_request record;
  v_new_studio_id uuid;
  v_invitee uuid;
BEGIN
  SELECT * INTO v_request FROM public.studio_formation_requests WHERE id = NEW.formation_id;
  IF v_request.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*) FILTER (WHERE status = 'declined')
    INTO v_pending, v_declined
  FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id;

  IF v_declined > 0 THEN
    UPDATE public.studio_formation_requests SET status = 'cancelled', completed_at = now() WHERE id = NEW.formation_id;
    RETURN NEW;
  END IF;

  IF v_pending = 0 THEN
    INSERT INTO public.studios (slug, name, tagline, created_by, member_count)
    VALUES (v_request.proposed_slug, v_request.proposed_name, v_request.proposed_tagline, v_request.founder_id, 1)
    RETURNING id INTO v_new_studio_id;

    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (v_new_studio_id, v_request.founder_id, 'owner');

    FOR v_invitee IN SELECT invitee_id FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id LOOP
      INSERT INTO public.studio_members (studio_id, user_id, role) VALUES (v_new_studio_id, v_invitee, 'member');
    END LOOP;

    UPDATE public.studios SET member_count = (SELECT COUNT(*) FROM public.studio_members WHERE studio_id = v_new_studio_id) WHERE id = v_new_studio_id;

    UPDATE public.studio_formation_requests SET status = 'completed', completed_at = now(), created_studio_id = v_new_studio_id WHERE id = NEW.formation_id;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_complete_studio_formation
AFTER UPDATE OF status ON anthem.studio_formation_invites
FOR EACH ROW WHEN (NEW.status IN ('accepted','declined'))
EXECUTE FUNCTION anthem.complete_studio_formation();

-- ========== JOB POSTS ==========
CREATE TABLE anthem.job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  posted_by uuid NOT NULL,
  title text NOT NULL,
  role_category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  budget_min integer,
  budget_max integer,
  budget_type public.job_budget_type NOT NULL DEFAULT 'fixed',
  location_type public.job_location_type NOT NULL DEFAULT 'remote',
  location text NOT NULL DEFAULT '',
  deadline date,
  status public.job_status NOT NULL DEFAULT 'open',
  applicants_count integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON anthem.job_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.job_posts TO authenticated;
GRANT ALL ON anthem.job_posts TO service_role;
ALTER TABLE anthem.job_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open jobs viewable by everyone" ON anthem.job_posts FOR SELECT USING (
  status = 'open' OR public.is_studio_member(studio_id, auth.uid())
);
CREATE POLICY "Studio admins create jobs" ON anthem.job_posts FOR INSERT TO authenticated WITH CHECK (
  public.is_studio_admin(studio_id, auth.uid()) AND posted_by = auth.uid()
);
CREATE POLICY "Studio admins update jobs" ON anthem.job_posts FOR UPDATE TO authenticated USING (public.is_studio_admin(studio_id, auth.uid()));
CREATE POLICY "Studio admins delete jobs" ON anthem.job_posts FOR DELETE TO authenticated USING (public.is_studio_admin(studio_id, auth.uid()));

-- ========== JOB APPLICATIONS ==========
CREATE TABLE anthem.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  cover_letter text NOT NULL DEFAULT '',
  portfolio_project_ids uuid[] NOT NULL DEFAULT '{}',
  status public.job_application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.job_applications TO authenticated;
GRANT ALL ON anthem.job_applications TO service_role;
ALTER TABLE anthem.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant or studio admin views applications" ON anthem.job_applications FOR SELECT TO authenticated USING (
  applicant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.job_posts j WHERE j.id = job_id AND public.is_studio_admin(j.studio_id, auth.uid())
  )
);
CREATE POLICY "Authenticated users apply" ON anthem.job_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Studio admins update application status" ON anthem.job_applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.job_posts j WHERE j.id = job_id AND public.is_studio_admin(j.studio_id, auth.uid()))
);
CREATE POLICY "Applicant withdraws own application" ON anthem.job_applications FOR DELETE TO authenticated USING (applicant_id = auth.uid());

-- triggers for applicants_count + updated_at
CREATE OR REPLACE FUNCTION anthem.bump_job_applicants_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = anthem, shared, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.job_posts SET applicants_count = applicants_count + 1, updated_at = now() WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.job_posts SET applicants_count = GREATEST(applicants_count - 1, 0), updated_at = now() WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_bump_job_applicants
AFTER INSERT OR DELETE ON anthem.job_applications
FOR EACH ROW EXECUTE FUNCTION anthem.bump_job_applicants_count();

CREATE TRIGGER trg_studios_updated_at BEFORE UPDATE ON anthem.studios FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();
CREATE TRIGGER trg_job_posts_updated_at BEFORE UPDATE ON anthem.job_posts FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();
CREATE TRIGGER trg_job_applications_updated_at BEFORE UPDATE ON anthem.job_applications FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

-- Indexes
CREATE INDEX idx_studio_members_user ON anthem.studio_members(user_id);
CREATE INDEX idx_job_posts_studio ON anthem.job_posts(studio_id);
CREATE INDEX idx_job_posts_status ON anthem.job_posts(status) WHERE status = 'open';
CREATE INDEX idx_job_applications_job ON anthem.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON anthem.job_applications(applicant_id);
CREATE INDEX idx_projects_studio ON anthem.projects(studio_id);
CREATE INDEX idx_formation_invites_invitee ON anthem.studio_formation_invites(invitee_id);


-- ── 20260529054232_77686e71-4a3c-4f12-a245-4efce87d6dc0.sql ──
-- Auto-grant admin to specific email, and audit log
CREATE OR REPLACE FUNCTION anthem.auto_grant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_grant_admin ON public.profiles;
-- CREATE TRIGGER profiles_auto_grant_admin
-- AFTER INSERT OR UPDATE OF email ON public.profiles
-- FOR EACH ROW EXECUTE FUNCTION anthem.auto_grant_admin();

-- Retroactively grant if profile already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'passawut.a.plus@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin audit log
CREATE TABLE IF NOT EXISTS shared.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON shared.admin_audit_log TO authenticated;
GRANT ALL ON shared.admin_audit_log TO service_role;

ALTER TABLE shared.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON shared.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log"
ON shared.admin_audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON shared.admin_audit_log (created_at DESC);

-- ── 20260529055043_74815f4a-aa66-4dfa-bc0a-2e2fbb02ba75.sql ──

ALTER TABLE anthem.studios
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS available_for_work boolean NOT NULL DEFAULT true;

ALTER TABLE anthem.studio_formation_requests
  ADD COLUMN IF NOT EXISTS proposed_logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_cover_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_expertise text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposed_contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_available_for_work boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proposed_website text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION anthem.complete_studio_formation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending int;
  v_declined int;
  v_request record;
  v_new_studio_id uuid;
  v_invitee uuid;
BEGIN
  SELECT * INTO v_request FROM public.studio_formation_requests WHERE id = NEW.formation_id;
  IF v_request.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*) FILTER (WHERE status = 'declined')
    INTO v_pending, v_declined
  FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id;

  IF v_declined > 0 THEN
    UPDATE public.studio_formation_requests SET status = 'cancelled', completed_at = now() WHERE id = NEW.formation_id;
    RETURN NEW;
  END IF;

  IF v_pending = 0 THEN
    INSERT INTO public.studios (
      slug, name, tagline, created_by, member_count,
      avatar_url, cover_url, bio, website,
      logo_url, expertise, contact_email, contact_phone, social_links, available_for_work
    )
    VALUES (
      v_request.proposed_slug, v_request.proposed_name, v_request.proposed_tagline, v_request.founder_id, 1,
      v_request.proposed_logo_url, v_request.proposed_cover_url, v_request.proposed_bio, v_request.proposed_website,
      v_request.proposed_logo_url, v_request.proposed_expertise, v_request.proposed_contact_email,
      v_request.proposed_contact_phone, v_request.proposed_social_links, v_request.proposed_available_for_work
    )
    RETURNING id INTO v_new_studio_id;

    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (v_new_studio_id, v_request.founder_id, 'owner');

    FOR v_invitee IN SELECT invitee_id FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id LOOP
      INSERT INTO public.studio_members (studio_id, user_id, role) VALUES (v_new_studio_id, v_invitee, 'member');
    END LOOP;

    UPDATE public.studios SET member_count = (SELECT COUNT(*) FROM public.studio_members WHERE studio_id = v_new_studio_id) WHERE id = v_new_studio_id;

    UPDATE public.studio_formation_requests SET status = 'completed', completed_at = now(), created_studio_id = v_new_studio_id WHERE id = NEW.formation_id;
  END IF;

  RETURN NEW;
END $function$;


-- ── 20260529061205_48c4ad40-e8b2-42e1-b647-319aaccfe735.sql ──

ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'hiring',
  ADD COLUMN IF NOT EXISTS poster_role text NOT NULL DEFAULT 'studio',
  ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS attached_cv_url text,
  ADD COLUMN IF NOT EXISTS attached_portfolio_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE anthem.job_posts ALTER COLUMN studio_id DROP NOT NULL;

-- Replace policies to allow non-studio posts
DROP POLICY IF EXISTS "Studio admins create jobs" ON anthem.job_posts;
DROP POLICY IF EXISTS "Studio admins delete jobs" ON anthem.job_posts;
DROP POLICY IF EXISTS "Studio admins update jobs" ON anthem.job_posts;
DROP POLICY IF EXISTS "Open jobs viewable by everyone" ON anthem.job_posts;

CREATE POLICY "Open jobs viewable by everyone"
ON anthem.job_posts FOR SELECT
USING (
  status = 'open'::job_status
  OR posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_member(studio_id, auth.uid()))
);

CREATE POLICY "Users create their own jobs"
ON anthem.job_posts FOR INSERT TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND (studio_id IS NULL OR is_studio_admin(studio_id, auth.uid()))
);

CREATE POLICY "Owners or studio admins update jobs"
ON anthem.job_posts FOR UPDATE TO authenticated
USING (
  posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_admin(studio_id, auth.uid()))
);

CREATE POLICY "Owners or studio admins delete jobs"
ON anthem.job_posts FOR DELETE TO authenticated
USING (
  posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_admin(studio_id, auth.uid()))
);


-- ── 20260529063003_ee21287a-287e-43d6-bcd5-4ddaff2f3235.sql ──

CREATE TABLE anthem.job_match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  match_score int NOT NULL DEFAULT 0,
  match_reasons text[] NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

GRANT SELECT, UPDATE, DELETE ON anthem.job_match_notifications TO authenticated;
GRANT ALL ON anthem.job_match_notifications TO service_role;

ALTER TABLE anthem.job_match_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own match notifications"
  ON anthem.job_match_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own match notifications"
  ON anthem.job_match_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own match notifications"
  ON anthem.job_match_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_jmn_user_unread
  ON anthem.job_match_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_jmn_job ON anthem.job_match_notifications(job_id);

-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS notify_job_match boolean NOT NULL DEFAULT true,
--   ADD COLUMN IF NOT EXISTS preferred_employment_types text[] NOT NULL DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}';

-- Trigger: เรียก edge function เมื่อมีงานใหม่หรือ status เปลี่ยนเป็น open
CREATE OR REPLACE FUNCTION anthem.dispatch_job_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  v_url text;
BEGIN
  IF NEW.status <> 'open' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' AND OLD.id = NEW.id
     AND OLD.title = NEW.title AND OLD.skills = NEW.skills
     AND OLD.role_category = NEW.role_category THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_functions_url', true);
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://uutbvwyoivqojozrangi.supabase.co/functions/v1/job-match-dispatch';
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER trg_dispatch_job_match
AFTER INSERT OR UPDATE OF status, skills, role_category, title
ON anthem.job_posts
FOR EACH ROW EXECUTE FUNCTION anthem.dispatch_job_match();


-- ── 20260530030929_b6273ad3-82ff-4839-9a8a-4f493e43b43d.sql ──
ALTER TABLE anthem.collab_requests
  ADD COLUMN IF NOT EXISTS external_drive_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS other_type_note text;

-- ── 20260530040013_e1a243f9-4592-4a1d-8f32-a19eac2dd480.sql ──
CREATE EXTENSION IF NOT EXISTS vector;

-- Per-image likes
CREATE TABLE anthem.image_likes (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id, image_url)
);
GRANT SELECT, INSERT, DELETE ON anthem.image_likes TO authenticated;
GRANT ALL ON anthem.image_likes TO service_role;
ALTER TABLE anthem.image_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own image likes" ON anthem.image_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own image likes" ON anthem.image_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own image likes" ON anthem.image_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inspire boards
CREATE TABLE anthem.inspire_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  cover_url text NOT NULL DEFAULT '',
  item_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON anthem.inspire_boards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.inspire_boards TO authenticated;
GRANT ALL ON anthem.inspire_boards TO service_role;
ALTER TABLE anthem.inspire_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boards public read" ON anthem.inspire_boards FOR SELECT USING (true);
CREATE POLICY "owner manage boards" ON anthem.inspire_boards FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Inspire items
CREATE TABLE anthem.inspire_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES anthem.inspire_boards(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, project_id, image_url)
);
GRANT SELECT ON anthem.inspire_items TO anon;
GRANT SELECT, INSERT, DELETE ON anthem.inspire_items TO authenticated;
GRANT ALL ON anthem.inspire_items TO service_role;
ALTER TABLE anthem.inspire_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items public read" ON anthem.inspire_items FOR SELECT USING (true);
CREATE POLICY "owner insert items" ON anthem.inspire_items FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.inspire_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));
CREATE POLICY "owner delete items" ON anthem.inspire_items FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.inspire_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION anthem.update_inspire_board_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.inspire_boards SET item_count=item_count+1, cover_url=COALESCE(NULLIF(cover_url,''), NEW.image_url), updated_at=now() WHERE id=NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.inspire_boards SET item_count=GREATEST(item_count-1,0), updated_at=now() WHERE id=OLD.board_id;
    RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER trg_inspire_items_count AFTER INSERT OR DELETE ON anthem.inspire_items FOR EACH ROW EXECUTE FUNCTION anthem.update_inspire_board_count();

-- Project embeddings for similarity
ALTER TABLE anthem.projects ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS projects_embedding_idx ON anthem.projects USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION anthem.match_similar_projects(_query vector(1536), _exclude uuid, _limit int DEFAULT 30)
RETURNS TABLE(id uuid, title text, category text, owner_id uuid, gallery_urls text[], cover_url text, similarity float)
LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT p.id, p.title, p.category, p.owner_id, p.gallery_urls, p.cover_url, 1-(p.embedding <=> _query) AS similarity
  FROM public.projects p
  WHERE p.status='Published' AND p.id <> _exclude AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> _query LIMIT _limit;
$$;

-- ── 20260530041001_a98909f9-d47a-4add-be5e-fe357cd30e4d.sql ──

-- Bump projects.likes when image_likes change
CREATE OR REPLACE FUNCTION anthem.bump_project_likes_from_image()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET likes = likes + 1 WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_image_likes_bump ON anthem.image_likes;
CREATE TRIGGER trg_image_likes_bump
AFTER INSERT OR DELETE ON anthem.image_likes
FOR EACH ROW EXECUTE FUNCTION anthem.bump_project_likes_from_image();

-- Recommend projects similar to what _user_id has liked recently
CREATE OR REPLACE FUNCTION anthem.recommend_from_likes(_user_id uuid, _limit integer DEFAULT 24)
RETURNS TABLE(
  id uuid, title text, category text, owner_id uuid,
  gallery_urls text[], cover_url text, similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = anthem, shared, public
AS $$
  WITH liked AS (
    SELECT DISTINCT project_id
    FROM public.image_likes
    WHERE user_id = _user_id
    ORDER BY project_id
    LIMIT 20
  ),
  centroid AS (
    SELECT AVG(p.embedding)::vector AS v
    FROM public.projects p
    JOIN liked l ON l.project_id = p.id
    WHERE p.embedding IS NOT NULL
  )
  SELECT p.id, p.title, p.category, p.owner_id, p.gallery_urls, p.cover_url,
         1 - (p.embedding <=> (SELECT v FROM centroid)) AS similarity
  FROM public.projects p, centroid c
  WHERE c.v IS NOT NULL
    AND p.status = 'Published'
    AND p.embedding IS NOT NULL
    AND p.id NOT IN (SELECT project_id FROM liked)
  ORDER BY p.embedding <=> c.v
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION anthem.recommend_from_likes(uuid, integer) TO authenticated, anon;


-- ── 20260530041444_9766889a-1212-4737-b89c-99b6661f4462.sql ──

-- WALLETS
CREATE TABLE shared.wallets (
  user_id uuid PRIMARY KEY,
  balance_px integer NOT NULL DEFAULT 0 CHECK (balance_px >= 0),
  lifetime_earned_px integer NOT NULL DEFAULT 0,
  lifetime_spent_px integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON shared.wallets TO authenticated;
GRANT ALL ON shared.wallets TO service_role;
ALTER TABLE shared.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets public read" ON shared.wallets FOR SELECT USING (true);
CREATE POLICY "wallets self insert" ON shared.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- GIFTS catalog
CREATE TABLE shared.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_th text NOT NULL,
  name_en text NOT NULL,
  price_px integer NOT NULL CHECK (price_px > 0),
  icon text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON shared.gifts TO anon, authenticated;
GRANT ALL ON shared.gifts TO service_role;
ALTER TABLE shared.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts public read" ON shared.gifts FOR SELECT USING (true);

INSERT INTO public.gifts (code, name_th, name_en, price_px, icon, display_order) VALUES
  ('hb_pencil',    'ดินสอ HB',       'HB Pencil',         5,   'Pencil',      1),
  ('drip_coffee',  'กาแฟดริป',       'Drip Coffee',       20,  'Coffee',      2),
  ('copic_marker', 'ปากกาโคปิก',     'Copic Marker',      50,  'Highlighter', 3),
  ('stylus_nib',   'หัวปากกาเมาส์',  'Stylus Nib',        100, 'PenTool',     4),
  ('pantone',      'สมุดสีแพนโทน',   'Pantone Swatch',    300, 'Palette',     5),
  ('software',     'ค่าโปรแกรม',     'Software License',  500, 'Laptop',      6);

-- GIFT TRANSACTIONS
CREATE TABLE shared.gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  gift_id uuid NOT NULL REFERENCES shared.gifts(id),
  price_px integer NOT NULL CHECK (price_px > 0),
  message text NOT NULL DEFAULT '',
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_gift_tx_recipient ON shared.gift_transactions(recipient_id, created_at DESC);
CREATE INDEX idx_gift_tx_sender ON shared.gift_transactions(sender_id, created_at DESC);
GRANT SELECT ON shared.gift_transactions TO authenticated;
GRANT ALL ON shared.gift_transactions TO service_role;
ALTER TABLE shared.gift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift tx participants read" ON shared.gift_transactions
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- WALLET TOPUPS (mock log)
CREATE TABLE shared.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_px integer NOT NULL CHECK (amount_px > 0),
  method text NOT NULL DEFAULT 'mock',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topups_user ON shared.wallet_topups(user_id, created_at DESC);
GRANT SELECT ON shared.wallet_topups TO authenticated;
GRANT ALL ON shared.wallet_topups TO service_role;
ALTER TABLE shared.wallet_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topups owner read" ON shared.wallet_topups FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CASHOUT REQUESTS
CREATE TABLE shared.cashout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gross_px integer NOT NULL CHECK (gross_px >= 1000),
  fee_px integer NOT NULL DEFAULT 0,
  net_px integer NOT NULL,
  bank_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_cashout_user ON shared.cashout_requests(user_id, created_at DESC);
GRANT SELECT ON shared.cashout_requests TO authenticated;
GRANT ALL ON shared.cashout_requests TO service_role;
ALTER TABLE shared.cashout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashout owner read" ON shared.cashout_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Helper: ensure wallet row exists
CREATE OR REPLACE FUNCTION anthem.ensure_wallet(_uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
  INSERT INTO public.wallets(user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
$$;

-- RPC: top-up (mock)
CREATE OR REPLACE FUNCTION anthem.topup_wallet_mock(_amount_px integer)
RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount_px IS NULL OR _amount_px <= 0 OR _amount_px > 1000000 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  PERFORM public.ensure_wallet(uid);
  UPDATE public.wallets
    SET balance_px = balance_px + _amount_px, updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;
  INSERT INTO public.wallet_topups(user_id, amount_px) VALUES (uid, _amount_px);
  RETURN w;
END $$;

-- RPC: send gift (atomic)
CREATE OR REPLACE FUNCTION anthem.send_gift(
  _recipient_id uuid,
  _gift_id uuid,
  _message text DEFAULT '',
  _project_id uuid DEFAULT NULL
)
RETURNS public.gift_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  uid uuid := auth.uid();
  g public.gifts;
  tx public.gift_transactions;
  sender_bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF uid = _recipient_id THEN RAISE EXCEPTION 'cannot gift yourself'; END IF;
  SELECT * INTO g FROM public.gifts WHERE id = _gift_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'gift not found'; END IF;

  PERFORM public.ensure_wallet(uid);
  PERFORM public.ensure_wallet(_recipient_id);

  -- Lock sender row & check balance
  SELECT balance_px INTO sender_bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_bal < g.price_px THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE public.wallets
    SET balance_px = balance_px - g.price_px,
        lifetime_spent_px = lifetime_spent_px + g.price_px,
        updated_at = now()
    WHERE user_id = uid;
  UPDATE public.wallets
    SET balance_px = balance_px + g.price_px,
        lifetime_earned_px = lifetime_earned_px + g.price_px,
        updated_at = now()
    WHERE user_id = _recipient_id;

  INSERT INTO public.gift_transactions(sender_id, recipient_id, gift_id, price_px, message, project_id)
    VALUES (uid, _recipient_id, _gift_id, g.price_px, COALESCE(_message,''), _project_id)
    RETURNING * INTO tx;
  RETURN tx;
END $$;

-- RPC: request cashout (mock auto-pay)
CREATE OR REPLACE FUNCTION anthem.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS public.cashout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  fee integer;
  net integer;
  c public.cashout_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount_px < 1000 THEN RAISE EXCEPTION 'minimum cashout is 1000 px'; END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT balance_px INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal < _amount_px THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  fee := FLOOR(_amount_px * 0.15)::int;
  net := _amount_px - fee;

  UPDATE public.wallets SET balance_px = balance_px - _amount_px, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.cashout_requests(user_id, gross_px, fee_px, net_px, bank_info, status, processed_at)
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info, '{}'::jsonb), 'mock_paid', now())
    RETURNING * INTO c;
  RETURN c;
END $$;

GRANT EXECUTE ON FUNCTION anthem.topup_wallet_mock(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.send_gift(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.request_cashout(integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.ensure_wallet(uuid) TO authenticated;


-- ── 20260530042055_3309e0f1-7d14-4b59-916f-deae4b053b47.sql ──
-- image_shares log
CREATE TABLE anthem.image_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  user_id uuid NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON anthem.image_shares TO anon, authenticated;
GRANT ALL ON anthem.image_shares TO service_role;

ALTER TABLE anthem.image_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read shares" ON anthem.image_shares FOR SELECT USING (true);
CREATE POLICY "anyone insert share" ON anthem.image_shares FOR INSERT WITH CHECK (true);

CREATE INDEX idx_image_shares_project_img ON anthem.image_shares(project_id, image_url);
CREATE INDEX idx_image_likes_project_img ON anthem.image_likes(project_id, image_url);

-- Public count RPCs (SECURITY DEFINER so anon can count likes without reading rows)
CREATE OR REPLACE FUNCTION anthem.image_like_count(_project_id uuid, _image_url text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT COUNT(*)::bigint FROM public.image_likes
  WHERE project_id = _project_id AND image_url = _image_url;
$$;

CREATE OR REPLACE FUNCTION anthem.image_share_count(_project_id uuid, _image_url text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT COUNT(*)::bigint FROM public.image_shares
  WHERE project_id = _project_id AND image_url = _image_url;
$$;

GRANT EXECUTE ON FUNCTION anthem.image_like_count(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem.image_share_count(uuid, text) TO anon, authenticated;

-- ── 20260530042619_6b4bd80d-d1a3-4a20-96d7-32063e170d32.sql ──
-- Overview KPI
CREATE OR REPLACE FUNCTION anthem.admin_gift_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'gift_count', (SELECT COUNT(*) FROM public.gift_transactions),
    'gift_volume_px', COALESCE((SELECT SUM(price_px) FROM public.gift_transactions),0),
    'unique_senders', (SELECT COUNT(DISTINCT sender_id) FROM public.gift_transactions),
    'unique_recipients', (SELECT COUNT(DISTINCT recipient_id) FROM public.gift_transactions),
    'projects_supported', (SELECT COUNT(DISTINCT project_id) FROM public.gift_transactions WHERE project_id IS NOT NULL),
    'topup_total_px', COALESCE((SELECT SUM(amount_px) FROM public.wallet_topups),0),
    'topup_count', (SELECT COUNT(*) FROM public.wallet_topups),
    'cashout_pending', (SELECT COUNT(*) FROM public.cashout_requests WHERE status = 'pending'),
    'cashout_paid', (SELECT COUNT(*) FROM public.cashout_requests WHERE status = 'mock_paid'),
    'cashout_net_total_px', COALESCE((SELECT SUM(net_px) FROM public.cashout_requests),0),
    'gift_count_7d', (SELECT COUNT(*) FROM public.gift_transactions WHERE created_at >= now() - interval '7 days'),
    'gift_volume_7d_px', COALESCE((SELECT SUM(price_px) FROM public.gift_transactions WHERE created_at >= now() - interval '7 days'),0)
  ) INTO result;
  RETURN result;
END $$;

-- Top recipients
CREATE OR REPLACE FUNCTION anthem.admin_top_gift_recipients(_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.recipient_id
    GROUP BY p.id
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Top senders
CREATE OR REPLACE FUNCTION anthem.admin_top_gift_senders(_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.sender_id
    GROUP BY p.id
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Top projects
CREATE OR REPLACE FUNCTION anthem.admin_top_gift_projects(_limit int DEFAULT 10)
RETURNS TABLE(project_id uuid, title text, cover_url text, owner_id uuid, owner_name text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT pr.id, pr.title, pr.cover_url, pr.owner_id, p.display_name,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.projects pr ON pr.id = g.project_id
    LEFT JOIN public.profiles p ON p.id = pr.owner_id
    WHERE g.project_id IS NOT NULL
    GROUP BY pr.id, p.display_name
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Recent gift transactions with joined info
CREATE OR REPLACE FUNCTION anthem.admin_recent_gifts(_limit int DEFAULT 100, _days int DEFAULT 90)
RETURNS TABLE(
  id uuid, created_at timestamptz, price_px integer, message text,
  sender_id uuid, sender_name text, sender_avatar text,
  recipient_id uuid, recipient_name text, recipient_avatar text,
  gift_name text, gift_icon text,
  project_id uuid, project_title text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT g.id, g.created_at, g.price_px, g.message,
           g.sender_id, sp.display_name, sp.avatar_url,
           g.recipient_id, rp.display_name, rp.avatar_url,
           gi.name_th, gi.icon,
           g.project_id, pr.title
    FROM public.gift_transactions g
    LEFT JOIN public.profiles sp ON sp.id = g.sender_id
    LEFT JOIN public.profiles rp ON rp.id = g.recipient_id
    LEFT JOIN public.gifts gi ON gi.id = g.gift_id
    LEFT JOIN public.projects pr ON pr.id = g.project_id
    WHERE g.created_at >= now() - make_interval(days => _days)
    ORDER BY g.created_at DESC
    LIMIT _limit;
END $$;

-- Cashouts (admin list)
CREATE OR REPLACE FUNCTION anthem.admin_list_cashouts(_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, processed_at timestamptz, status text,
  gross_px integer, fee_px integer, net_px integer, bank_info jsonb,
  user_id uuid, user_name text, user_avatar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT c.id, c.created_at, c.processed_at, c.status,
           c.gross_px, c.fee_px, c.net_px, c.bank_info,
           c.user_id, p.display_name, p.avatar_url
    FROM public.cashout_requests c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT _limit;
END $$;

-- Top-ups (admin list)
CREATE OR REPLACE FUNCTION anthem.admin_list_topups(_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, amount_px integer, method text, status text,
  user_id uuid, user_name text, user_avatar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = anthem, shared, public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT t.id, t.created_at, t.amount_px, t.method, t.status,
           t.user_id, p.display_name, p.avatar_url
    FROM public.wallet_topups t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    ORDER BY t.created_at DESC
    LIMIT _limit;
END $$;

-- Mark cashout paid
CREATE OR REPLACE FUNCTION anthem.admin_mark_cashout_paid(_id uuid)
RETURNS public.cashout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE c public.cashout_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.cashout_requests
    SET status = 'mock_paid', processed_at = now()
    WHERE id = _id
    RETURNING * INTO c;
  IF NOT FOUND THEN RAISE EXCEPTION 'cashout not found'; END IF;
  RETURN c;
END $$;

GRANT EXECUTE ON FUNCTION anthem.admin_gift_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_top_gift_recipients(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_top_gift_senders(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_top_gift_projects(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_recent_gifts(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_list_cashouts(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_list_topups(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_mark_cashout_paid(uuid) TO authenticated;

-- ── 20260530045525_4f0ef6cc-bbb8-4df3-be1c-4f5d4cf5cc14.sql ──

-- Enum for ad status
DO $enum$ BEGIN CREATE TYPE public.ad_status AS ENUM ('draft','pending','approved','active','paused','rejected','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.ad_package AS ENUM ('basic','standard','premium'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.ad_application_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.ad_event_type AS ENUM ('impression','click'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

-- =========================================
-- ad_campaigns
-- =========================================
CREATE TABLE anthem.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_user_id uuid NOT NULL,
  title text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  target_url text NOT NULL,
  cta_label text NOT NULL DEFAULT 'เรียนรู้เพิ่มเติม',
  package public.ad_package NOT NULL DEFAULT 'basic',
  price_px integer NOT NULL DEFAULT 0,
  status public.ad_status NOT NULL DEFAULT 'pending',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  rejection_reason text NOT NULL DEFAULT '',
  application_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON anthem.ad_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.ad_campaigns TO authenticated;
GRANT ALL ON anthem.ad_campaigns TO service_role;

ALTER TABLE anthem.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active ads viewable by everyone"
  ON anthem.ad_campaigns FOR SELECT
  USING (status = 'active' AND (end_at IS NULL OR end_at > now()) AND start_at <= now());

CREATE POLICY "Advertiser views own campaigns"
  ON anthem.ad_campaigns FOR SELECT
  TO authenticated
  USING (advertiser_user_id = auth.uid());

CREATE POLICY "Admins manage all campaigns"
  ON anthem.ad_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ad_campaigns_updated
  BEFORE UPDATE ON anthem.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

CREATE INDEX idx_ad_campaigns_status ON anthem.ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_advertiser ON anthem.ad_campaigns(advertiser_user_id);

-- =========================================
-- ad_events
-- =========================================
CREATE TABLE anthem.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES anthem.ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  event_type public.ad_event_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON anthem.ad_events TO anon, authenticated;
GRANT SELECT ON anthem.ad_events TO authenticated;
GRANT ALL ON anthem.ad_events TO service_role;

ALTER TABLE anthem.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert ad event"
  ON anthem.ad_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view ad events"
  ON anthem.ad_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ad_events_ad ON anthem.ad_events(ad_id);

-- =========================================
-- ad_applications
-- =========================================
CREATE TABLE anthem.ad_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  ad_title text NOT NULL,
  ad_tagline text NOT NULL DEFAULT '',
  ad_description text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  target_url text NOT NULL,
  cta_label text NOT NULL DEFAULT 'เรียนรู้เพิ่มเติม',
  package public.ad_package NOT NULL DEFAULT 'basic',
  duration_days integer NOT NULL DEFAULT 7,
  budget_px integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status public.ad_application_status NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON anthem.ad_applications TO authenticated;
GRANT ALL ON anthem.ad_applications TO service_role;

ALTER TABLE anthem.ad_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications"
  ON anthem.ad_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own applications"
  ON anthem.ad_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update applications"
  ON anthem.ad_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ad_applications_updated
  BEFORE UPDATE ON anthem.ad_applications
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

-- =========================================
-- Functions
-- =========================================
CREATE OR REPLACE FUNCTION anthem.log_ad_event(_ad_id uuid, _event_type public.ad_event_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  INSERT INTO public.ad_events(ad_id, user_id, event_type)
    VALUES (_ad_id, auth.uid(), _event_type);
  IF _event_type = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION anthem.get_active_ads(_limit integer DEFAULT 20)
RETURNS SETOF public.ad_campaigns
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT * FROM public.ad_campaigns
  WHERE status = 'active'
    AND start_at <= now()
    AND (end_at IS NULL OR end_at > now())
  ORDER BY random()
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_approve_ad_application(_id uuid, _duration_days integer DEFAULT NULL)
RETURNS public.ad_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  app public.ad_applications;
  c public.ad_campaigns;
  dur integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO app FROM public.ad_applications WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  dur := COALESCE(_duration_days, app.duration_days, 7);

  INSERT INTO public.ad_campaigns(
    advertiser_user_id, title, tagline, image_url, target_url, cta_label,
    package, price_px, status, start_at, end_at, application_id
  ) VALUES (
    app.user_id, app.ad_title, app.ad_tagline, app.image_url, app.target_url, app.cta_label,
    app.package, app.budget_px, 'active', now(), now() + make_interval(days => dur), app.id
  ) RETURNING * INTO c;

  UPDATE public.ad_applications
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _id;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION anthem.admin_reject_ad_application(_id uuid, _note text DEFAULT '')
RETURNS public.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE app public.ad_applications;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ad_applications
    SET status = 'rejected', admin_note = COALESCE(_note,''), reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _id
    RETURNING * INTO app;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  RETURN app;
END $$;


-- ── 20260530050918_0f722052-16df-48db-bc6b-3ebff6190835.sql ──
-- 1. Extend ad_application_status with payment states
ALTER TYPE ad_application_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE ad_application_status ADD VALUE IF NOT EXISTS 'paid';

-- 2. Extend ad_event_type with 'interest' for detail page
ALTER TYPE ad_event_type ADD VALUE IF NOT EXISTS 'interest';


-- ── 20260530051002_8f00db23-4fc2-4643-b2e9-1dac1c7af459.sql ──
-- Columns for ad_applications: payment tracking
ALTER TABLE anthem.ad_applications
  ADD COLUMN IF NOT EXISTS amount_thb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Columns for ad_campaigns: promotion text + payment ref
ALTER TABLE anthem.ad_campaigns
  ADD COLUMN IF NOT EXISTS promotion_text text NOT NULL DEFAULT '';

-- Columns for ad_events: richer analytics
ALTER TABLE anthem.ad_events
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_created ON anthem.ad_events(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON anthem.ad_events(event_type);

-- Mock payment RPC: marks an application as paid (prototype, no real Stripe)
CREATE OR REPLACE FUNCTION anthem.mock_pay_ad_application(_id uuid)
RETURNS public.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  app public.ad_applications;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO app FROM public.ad_applications WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF app.user_id <> uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF app.status NOT IN ('pending_payment', 'pending') THEN
    RAISE EXCEPTION 'invalid status for payment';
  END IF;
  UPDATE public.ad_applications
    SET status = 'paid', paid_at = now(), updated_at = now()
    WHERE id = _id
    RETURNING * INTO app;
  RETURN app;
END $$;

REVOKE ALL ON FUNCTION anthem.mock_pay_ad_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.mock_pay_ad_application(uuid) TO authenticated;

-- Per-day events for a campaign (last N days)
CREATE OR REPLACE FUNCTION anthem.ad_events_daily(_ad_id uuid, _days int DEFAULT 14)
RETURNS TABLE(day date, impressions bigint, clicks bigint, interests bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  WITH days AS (
    SELECT generate_series(
      (now() - make_interval(days => _days - 1))::date,
      now()::date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    d.day,
    COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0)::bigint AS impressions,
    COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0)::bigint AS clicks,
    COALESCE(SUM(CASE WHEN e.event_type = 'interest' THEN 1 ELSE 0 END), 0)::bigint AS interests
  FROM days d
  LEFT JOIN public.ad_events e
    ON e.ad_id = _ad_id
    AND e.created_at::date = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;
$$;

GRANT EXECUTE ON FUNCTION anthem.ad_events_daily(uuid, int) TO authenticated, anon;

-- Admin: overall ad stats summary
CREATE OR REPLACE FUNCTION anthem.admin_ad_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'campaigns_total', (SELECT COUNT(*) FROM public.ad_campaigns),
    'campaigns_active', (SELECT COUNT(*) FROM public.ad_campaigns WHERE status='active'),
    'impressions_total', COALESCE((SELECT SUM(impressions) FROM public.ad_campaigns),0),
    'clicks_total', COALESCE((SELECT SUM(clicks) FROM public.ad_campaigns),0),
    'impressions_7d', (SELECT COUNT(*) FROM public.ad_events WHERE event_type='impression' AND created_at >= now() - interval '7 days'),
    'clicks_7d', (SELECT COUNT(*) FROM public.ad_events WHERE event_type='click' AND created_at >= now() - interval '7 days'),
    'unique_viewers_7d', (SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) FROM public.ad_events WHERE event_type='impression' AND created_at >= now() - interval '7 days'),
    'applications_pending', (SELECT COUNT(*) FROM public.ad_applications WHERE status='pending'),
    'applications_pending_payment', (SELECT COUNT(*) FROM public.ad_applications WHERE status='pending_payment'),
    'applications_paid', (SELECT COUNT(*) FROM public.ad_applications WHERE status='paid'),
    'revenue_thb', COALESCE((SELECT SUM(amount_thb) FROM public.ad_applications WHERE status IN ('paid','approved')),0)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION anthem.admin_ad_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.admin_ad_overview() TO authenticated;

-- Public RPC to fetch a single campaign for detail page (includes paused/expired if matches id)
-- Only returns active campaigns to keep prototype simple
CREATE OR REPLACE FUNCTION anthem.get_ad_campaign(_id uuid)
RETURNS public.ad_campaigns
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT * FROM public.ad_campaigns WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION anthem.get_ad_campaign(uuid) TO authenticated, anon;

-- Updated log_ad_event with placement + session_id
CREATE OR REPLACE FUNCTION anthem.log_ad_event_v2(
  _ad_id uuid,
  _event_type ad_event_type,
  _placement text DEFAULT 'feed',
  _session_id text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  INSERT INTO public.ad_events(ad_id, user_id, event_type, placement, session_id)
    VALUES (_ad_id, auth.uid(), _event_type, COALESCE(_placement,'feed'), COALESCE(_session_id,''));
  IF _event_type = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION anthem.log_ad_event_v2(uuid, ad_event_type, text, text) TO authenticated, anon;


-- ── 20260530051606_35efe13b-6fc2-4e78-8d9b-eef4ea03e55f.sql ──
ALTER TABLE anthem.ad_campaigns REPLICA IDENTITY FULL;
ALTER TABLE anthem.ad_applications REPLICA IDENTITY FULL;
ALTER TABLE anthem.ad_events REPLICA IDENTITY FULL;

DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.ad_campaigns; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.ad_applications; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.ad_events; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- ── 20260530052725_d824579e-affd-402c-bf41-854aa0a38e69.sql ──

DO $enum$ BEGIN CREATE TYPE public.contract_type AS ENUM ('project','fulltime'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
DO $enum$ BEGIN CREATE TYPE public.contract_status AS ENUM ('draft','finalized'); EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

CREATE TABLE shared.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES anthem.job_posts(id) ON DELETE SET NULL,
  type public.contract_type NOT NULL DEFAULT 'project',
  title text NOT NULL DEFAULT 'ร่างสัญญาจ้างงาน',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_md text NOT NULL DEFAULT '',
  status public.contract_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_user ON shared.contracts(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.contracts TO authenticated;
GRANT ALL ON shared.contracts TO service_role;

ALTER TABLE shared.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read" ON shared.contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner insert" ON shared.contracts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON shared.contracts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON shared.contracts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON shared.contracts
  FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();


-- ── 20260530055218_748b490c-e07f-4cfb-a9b8-f31f07fbf052.sql ──
-- skipped (schemas created in 20260606120000_ecosystem_schemas.sql)


-- ── 20260530055442_1b6eb85a-61a2-4324-9e13-0dfd4c6dcf3d.sql ──
-- skipped 20260530055442_1b6eb85a-61a2-4324-9e13-0dfd4c6dcf3d.sql (notifications in 20260606120200)


-- ── 20260530060322_e147ca59-a2ad-40bf-8cce-543d80c96620.sql ──
-- Phase 3b: Wire existing Anthem events into shared.notifications

-- 1) New hire request → notify the freelancer
CREATE OR REPLACE FUNCTION anthem.notify_on_hire_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
BEGIN
  PERFORM shared.push_notification(
    NEW.freelancer_id,
    'anthem',
    'hire_request',
    'มีคำขอจ้างงานใหม่',
    COALESCE(NEW.client_name, '') || ' ส่งคำขอจ้างงาน: ' || COALESCE(NEW.project_title,''),
    '/hire-requests',
    jsonb_build_object('request_id', NEW.id, 'project_title', NEW.project_title)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_hire_request ON anthem.hiring_requests;
CREATE TRIGGER trg_notify_hire_request
  AFTER INSERT ON anthem.hiring_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_hire_request();

-- 2) New collab request → notify the recipient
CREATE OR REPLACE FUNCTION anthem.notify_on_collab_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'collab_request',
    'มีคำขอร่วมงานใหม่',
    COALESCE(v_sender_name,'มีคน') || ' ส่งคำขอร่วมงานถึงคุณ',
    '/collab-requests',
    jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_collab_request ON anthem.collab_requests;
CREATE TRIGGER trg_notify_collab_request
  AFTER INSERT ON anthem.collab_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_collab_request();

-- 3) New job application → notify all studio admins (or the job poster)
CREATE OR REPLACE FUNCTION anthem.notify_on_job_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_job record;
  v_admin uuid;
  v_applicant_name text;
BEGIN
  SELECT id, title, studio_id, posted_by INTO v_job FROM public.job_posts WHERE id = NEW.job_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT display_name INTO v_applicant_name FROM public.profiles WHERE id = NEW.applicant_id;

  IF v_job.studio_id IS NOT NULL THEN
    FOR v_admin IN
      SELECT user_id FROM public.studio_members
      WHERE studio_id = v_job.studio_id AND role IN ('owner','admin')
    LOOP
      PERFORM shared.push_notification(
        v_admin,
        'anthem',
        'job_application',
        'มีผู้สมัครงานใหม่',
        COALESCE(v_applicant_name,'มีคน') || ' สมัคร: ' || COALESCE(v_job.title,''),
        '/jobs/' || v_job.id::text,
        jsonb_build_object('application_id', NEW.id, 'job_id', v_job.id)
      );
    END LOOP;
  ELSE
    PERFORM shared.push_notification(
      v_job.posted_by,
      'anthem',
      'job_application',
      'มีผู้สมัครงานใหม่',
      COALESCE(v_applicant_name,'มีคน') || ' สมัคร: ' || COALESCE(v_job.title,''),
      '/jobs/' || v_job.id::text,
      jsonb_build_object('application_id', NEW.id, 'job_id', v_job.id)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_job_application ON anthem.job_applications;
CREATE TRIGGER trg_notify_job_application
  AFTER INSERT ON anthem.job_applications
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_job_application();

-- 4) New chat message → notify the other participant
CREATE OR REPLACE FUNCTION anthem.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_conv record;
  v_recipient uuid;
  v_sender_name text;
  v_preview text;
BEGIN
  SELECT client_id, freelancer_id, project_title INTO v_conv
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_recipient := CASE WHEN NEW.sender_id = v_conv.client_id THEN v_conv.freelancer_id ELSE v_conv.client_id END;
  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := CASE WHEN length(COALESCE(NEW.content,'')) > 80 THEN substring(NEW.content from 1 for 80) || '…' ELSE COALESCE(NEW.content,'(ไฟล์แนบ)') END;

  PERFORM shared.push_notification(
    v_recipient,
    'anthem',
    'new_message',
    COALESCE(v_sender_name,'มีข้อความใหม่'),
    v_preview,
    '/chat/' || NEW.conversation_id::text,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_message ON shared.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON shared.messages
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_message();

-- ── 20260530065715_07627e80-4415-4e04-a6bd-f49654b7cbbf.sql ──
-- ============================================================
-- Security hardening migration
-- 1. Wallets: stop exposing balances publicly
-- 2. ad_events / image_shares: require auth for INSERT
-- 3. Revoke EXECUTE on internal trigger / admin / handler functions
--    from public+anon (keep service_role + authenticated where needed)
-- ============================================================

-- ---------- WALLETS: privacy fix ----------
DROP POLICY IF EXISTS "wallets public read" ON shared.wallets;
CREATE POLICY "wallets owner read"
  ON shared.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can still see all wallets (for moderation)
CREATE POLICY "wallets admin read"
  ON shared.wallets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- AD EVENTS: require auth ----------
DROP POLICY IF EXISTS "Anyone insert ad event" ON anthem.ad_events;
CREATE POLICY "Authenticated insert ad event"
  ON anthem.ad_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ---------- IMAGE SHARES: require auth ----------
DROP POLICY IF EXISTS "anyone insert share" ON anthem.image_shares;
CREATE POLICY "Authenticated insert share"
  ON anthem.image_shares FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ---------- Revoke EXECUTE on TRIGGER functions ----------
-- Trigger fns are only invoked by the database itself; no client should call them.
REVOKE ALL ON FUNCTION anthem.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.update_collection_item_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.update_inspire_board_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.complete_studio_formation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.dispatch_job_match() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_hire_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_collab_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_job_application() FROM PUBLIC, anon, authenticated;

-- Internal helper
REVOKE ALL ON FUNCTION anthem.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;

-- ---------- Restrict admin_* functions to authenticated only ----------
-- (the functions themselves check has_role, but we want anon blocked at the door)
REVOKE EXECUTE ON FUNCTION anthem.admin_ad_overview()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_gift_overview()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_approve_ad_application(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_reject_ad_application(uuid, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_list_cashouts(integer)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_list_topups(integer)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_mark_cashout_paid(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_recent_gifts(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_top_gift_projects(integer)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_top_gift_recipients(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_top_gift_senders(integer)    FROM PUBLIC, anon;

-- ---------- Restrict user-action functions to authenticated only ----------
REVOKE EXECUTE ON FUNCTION anthem.send_gift(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.request_cashout(integer, jsonb)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.topup_wallet_mock(integer)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.log_ad_event(uuid, ad_event_type) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.log_ad_event_v2(uuid, ad_event_type, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.mock_pay_ad_application(uuid)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.increment_project_view(uuid)     FROM PUBLIC, anon;

-- has_role / is_studio_* / is_formation_participant are used inside RLS — keep them
-- callable; they only read user_roles which has its own policy.
-- get_active_ads / get_ad_campaign / image_like_count / image_share_count
-- / ad_events_daily are read-only public data; intentionally remain anon-callable.

-- ── 20260530093129_bc55d94d-075c-44f3-9301-d0de35e98dcc.sql ──

CREATE OR REPLACE FUNCTION anthem.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = anthem, shared, public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE anthem.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user','project','comment','studio','message')),
  target_id uuid NOT NULL,
  target_owner_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','nsfw','copyright','scam','impersonation','other')),
  details text NOT NULL DEFAULT '',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_note text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON anthem.user_reports TO authenticated;
GRANT ALL ON anthem.user_reports TO service_role;

ALTER TABLE anthem.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters insert own reports"
ON anthem.user_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id AND (target_owner_id IS NULL OR reporter_id <> target_owner_id));

CREATE POLICY "Reporters view own; admins view all"
ON anthem.user_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update reports"
ON anthem.user_reports FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete reports"
ON anthem.user_reports FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_user_reports_status_created ON anthem.user_reports (status, created_at DESC);
CREATE INDEX idx_user_reports_target ON anthem.user_reports (target_type, target_id);
CREATE INDEX idx_user_reports_reporter ON anthem.user_reports (reporter_id);
CREATE UNIQUE INDEX uniq_open_report_per_reporter_target
  ON anthem.user_reports (reporter_id, target_type, target_id) WHERE status = 'open';

CREATE TRIGGER trg_user_reports_updated_at
BEFORE UPDATE ON anthem.user_reports
FOR EACH ROW EXECUTE FUNCTION anthem.touch_updated_at();

CREATE TABLE anthem.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL DEFAULT 'general',
  route text NOT NULL DEFAULT '',
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  viewport text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON anthem.app_feedback TO authenticated;
GRANT ALL ON anthem.app_feedback TO service_role;

ALTER TABLE anthem.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON anthem.app_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own; admins view all"
ON anthem.app_feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete feedback"
ON anthem.app_feedback FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_app_feedback_feature_created ON anthem.app_feedback (feature, created_at DESC);
CREATE INDEX idx_app_feedback_rating ON anthem.app_feedback (rating);

DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.user_reports; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE anthem.app_feedback; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;


-- ── 20260530094341_f29eb4bb-c27d-4fd7-9849-ca24386e238c.sql ──

-- 1. Extend app_feedback with status/admin fields and optional project link
ALTER TABLE anthem.app_feedback
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_app_feedback_created ON anthem.app_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_status ON anthem.app_feedback(status);
CREATE INDEX IF NOT EXISTS idx_app_feedback_feature ON anthem.app_feedback(feature);
CREATE INDEX IF NOT EXISTS idx_app_feedback_project ON anthem.app_feedback(project_id);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_app_feedback_updated ON anthem.app_feedback;
CREATE TRIGGER trg_app_feedback_updated BEFORE UPDATE ON anthem.app_feedback
FOR EACH ROW EXECUTE FUNCTION anthem.set_updated_at();

-- Allow admin update
DROP POLICY IF EXISTS "Admins update feedback" ON anthem.app_feedback;
CREATE POLICY "Admins update feedback" ON anthem.app_feedback
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Extend user_reports with rich evidence files
ALTER TABLE anthem.user_reports
  ADD COLUMN IF NOT EXISTS evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Storage bucket for evidence (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own evidence" ON storage.objects;
CREATE POLICY "Users upload own evidence" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners or admins read evidence" ON storage.objects;
CREATE POLICY "Owners or admins read evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'report-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Owners or admins delete evidence" ON storage.objects;
CREATE POLICY "Owners or admins delete evidence" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'report-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. RPC: create_report with rate limit
CREATE OR REPLACE FUNCTION anthem.create_report(
  _target_type text,
  _target_id uuid,
  _target_owner_id uuid,
  _reason text,
  _details text,
  _evidence_urls text[],
  _evidence_files jsonb
) RETURNS public.user_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  uid uuid := auth.uid();
  recent_count int;
  dup_count int;
  r public.user_reports;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน'; END IF;
  IF _target_owner_id IS NOT NULL AND _target_owner_id = uid THEN
    RAISE EXCEPTION 'INVALID: ไม่สามารถรายงานตัวเองได้';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.user_reports
  WHERE reporter_id = uid AND created_at > now() - interval '10 minutes';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งรายงานเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่';
  END IF;

  SELECT COUNT(*) INTO dup_count
  FROM public.user_reports
  WHERE reporter_id = uid
    AND target_type = _target_type
    AND target_id = _target_id
    AND created_at > now() - interval '1 hour';
  IF dup_count >= 1 THEN
    RAISE EXCEPTION 'DUPLICATE: คุณได้รายงานสิ่งนี้ไปแล้ว ทีมงานกำลังตรวจสอบ';
  END IF;

  INSERT INTO public.user_reports(
    reporter_id, target_type, target_id, target_owner_id,
    reason, details, evidence_urls, evidence_files
  ) VALUES (
    uid, _target_type, _target_id, _target_owner_id,
    _reason, COALESCE(_details,''), COALESCE(_evidence_urls,'{}'::text[]),
    COALESCE(_evidence_files,'[]'::jsonb)
  ) RETURNING * INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION anthem.create_report(text,uuid,uuid,text,text,text[],jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION anthem.create_report(text,uuid,uuid,text,text,text[],jsonb) TO authenticated;

-- 5. RPC: submit_feedback with rate limit
CREATE OR REPLACE FUNCTION anthem.submit_feedback(
  _feature text,
  _route text,
  _rating int,
  _message text,
  _project_id uuid,
  _user_agent text,
  _viewport text
) RETURNS anthem.app_feedback
LANGUAGE plpgsql SECURITY DEFINER SET search_path = anthem, shared, public AS $$
DECLARE
  uid uuid := auth.uid();
  recent_min int;
  recent_hour int;
  f anthem.app_feedback;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน'; END IF;
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1-5'; END IF;

  SELECT COUNT(*) INTO recent_min FROM anthem.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent_min >= 1 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กเร็วเกินไป กรุณารอสักครู่';
  END IF;

  SELECT COUNT(*) INTO recent_hour FROM anthem.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 hour';
  IF recent_hour >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กถึงขีดจำกัดต่อชั่วโมงแล้ว';
  END IF;

  INSERT INTO anthem.app_feedback(
    user_id, feature, route, rating, message, project_id, user_agent, viewport
  ) VALUES (
    uid, COALESCE(_feature,'general'), COALESCE(_route,''), _rating,
    COALESCE(_message,''), _project_id,
    COALESCE(LEFT(_user_agent,500),''), COALESCE(_viewport,'')
  ) RETURNING * INTO f;
  RETURN f;
END $$;

REVOKE ALL ON FUNCTION anthem.submit_feedback(text,text,int,text,uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION anthem.submit_feedback(text,text,int,text,uuid,text,text) TO authenticated;

-- PostgREST exposes public schema RPCs; delegate to anthem implementation
CREATE OR REPLACE FUNCTION public.submit_feedback(
  _feature text, _route text, _rating int, _message text,
  _project_id uuid, _user_agent text, _viewport text
)
RETURNS anthem.app_feedback
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT anthem.submit_feedback(
    _feature, _route, _rating, _message, _project_id, _user_agent, _viewport
  );
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text,text,int,text,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text,text,int,text,uuid,text,text) TO authenticated;

-- 6. Admin notification triggers
CREATE OR REPLACE FUNCTION anthem.notify_admins_on_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = anthem, shared, public, shared AS $$
DECLARE v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin, 'anthem', 'new_report',
      'มีรายงานใหม่',
      'เหตุผล: ' || COALESCE(NEW.reason,'') || ' • ' || COALESCE(NEW.target_type,''),
      '/admin/reports',
      jsonb_build_object('report_id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_report ON anthem.user_reports;
CREATE TRIGGER trg_notify_admins_report AFTER INSERT ON anthem.user_reports
FOR EACH ROW EXECUTE FUNCTION anthem.notify_admins_on_report();

CREATE OR REPLACE FUNCTION anthem.notify_admins_on_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = anthem, shared, public, shared AS $$
DECLARE v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin, 'anthem', 'new_feedback',
      'มีฟีดแบ็กใหม่ (' || NEW.rating::text || '★)',
      COALESCE(NULLIF(NEW.message,''), NEW.feature),
      '/admin/feedback',
      jsonb_build_object('feedback_id', NEW.id, 'feature', NEW.feature, 'rating', NEW.rating)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_feedback ON anthem.app_feedback;
CREATE TRIGGER trg_notify_admins_feedback AFTER INSERT ON anthem.app_feedback
FOR EACH ROW EXECUTE FUNCTION anthem.notify_admins_on_feedback();


-- ── 20260530101336_ad3a131b-fc2a-46ee-9190-8dbf2ad3e73c.sql ──
-- Seed mock auth users so we can attach mock profiles and data for testing.
DO $$
DECLARE
  i int;
  uid uuid;
  uname text;
  usernames text[] := ARRAY['nara_illust','kit_motion','ploy_ux','noom_photo','ben_3d','mark_dev','aim_brand','ploen_video','write_co','kim_game','tan_arch','fern_logo','jay_music','mint_uxr','oat_dev','pim_illust','ton_anim','ice_social','art_paint','dev_ops'];
BEGIN
  FOR i IN 0..19 LOOP
    uid := ('00000000-0000-0000-0000-00000000a0' || lpad(to_hex(i),2,'0'))::uuid;
    uname := usernames[i+1];
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated','authenticated', uname || '@mock.so1o', crypt('Mockpass123!', gen_salt('bf')), now(), now() - interval '60 days', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', uname), false,'','','','')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ── 20260530121450_385d8e96-fd61-489d-9abe-7363195f9fed.sql ──

-- ============================================================
-- 1. PROFILES: KYC + account status + risk score
-- ============================================================
-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
--   ADD COLUMN IF NOT EXISTS verified_at timestamptz,
--   ADD COLUMN IF NOT EXISTS verified_by uuid,
--   ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','frozen','under_review')),
--   ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
--   ADD COLUMN IF NOT EXISTS frozen_reason text NOT NULL DEFAULT '',
--   ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0;

-- ============================================================
-- 2. WALLETS: split balance into purchased + earned
-- ============================================================
ALTER TABLE shared.wallets
  ADD COLUMN IF NOT EXISTS purchased_px integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earned_px integer NOT NULL DEFAULT 0;

-- Migrate existing balance into purchased (safer per plan)
UPDATE public.wallets SET purchased_px = balance_px WHERE balance_px > 0 AND purchased_px = 0;

-- Drop & recreate balance_px as generated column
ALTER TABLE shared.wallets DROP COLUMN IF EXISTS balance_px;
ALTER TABLE shared.wallets ADD COLUMN balance_px integer GENERATED ALWAYS AS (purchased_px + earned_px) STORED;

-- ============================================================
-- 3. WALLET_TOPUPS: holding period
-- ============================================================
ALTER TABLE shared.wallet_topups
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

-- Backfill: existing topups already available
UPDATE public.wallet_topups SET available_at = created_at WHERE available_at > created_at + interval '23 hours';

-- ============================================================
-- 4. gift_limits_config (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS shared.gift_limits_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_limit_unverified int NOT NULL DEFAULT 500,
  daily_limit_verified int NOT NULL DEFAULT 5000,
  velocity_per_hour int NOT NULL DEFAULT 10,
  hold_hours int NOT NULL DEFAULT 24,
  min_account_age_hours int NOT NULL DEFAULT 1,
  max_topup_per_tx int NOT NULL DEFAULT 100000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gift_limits_config(id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON shared.gift_limits_config TO authenticated, anon;
GRANT ALL ON shared.gift_limits_config TO service_role;
ALTER TABLE shared.gift_limits_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read limits config" ON shared.gift_limits_config FOR SELECT USING (true);
CREATE POLICY "Admins update limits" ON shared.gift_limits_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- ============================================================
-- 5. aml_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS shared.aml_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL CHECK (flag_type IN ('velocity','circular_transfer','new_account_burst','large_amount','self_network','manual')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','dismissed','actioned')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aml_flags_status_created ON shared.aml_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_flags_user ON shared.aml_flags(user_id);

GRANT SELECT, INSERT, UPDATE ON shared.aml_flags TO authenticated;
GRANT ALL ON shared.aml_flags TO service_role;
ALTER TABLE shared.aml_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read aml_flags" ON shared.aml_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update aml_flags" ON shared.aml_flags FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
-- INSERT happens only via SECURITY DEFINER functions/triggers

-- ============================================================
-- 6. kyc_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS shared.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  contact_note text NOT NULL DEFAULT '',
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_one_pending_per_user EXCLUDE (user_id WITH =) WHERE (status = 'pending')
);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON shared.kyc_requests(status, submitted_at DESC);

GRANT SELECT, INSERT ON shared.kyc_requests TO authenticated;
GRANT ALL ON shared.kyc_requests TO service_role;
ALTER TABLE shared.kyc_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own kyc" ON shared.kyc_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users insert own kyc" ON shared.kyc_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update kyc" ON shared.kyc_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- ============================================================
-- 7. Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.available_purchased_px(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH released AS (
    SELECT COALESCE(SUM(amount_px),0)::int AS amt FROM public.wallet_topups
    WHERE user_id = _uid AND available_at <= now()
  ),
  spent AS (
    -- amount of purchased_px already consumed = total topups - current purchased_px
    SELECT COALESCE(SUM(amount_px),0)::int AS total FROM public.wallet_topups WHERE user_id = _uid
  ),
  cur AS (SELECT purchased_px FROM public.wallets WHERE user_id = _uid)
  SELECT GREATEST(
    LEAST(
      (SELECT purchased_px FROM cur),
      (SELECT amt FROM released) - ((SELECT total FROM spent) - (SELECT purchased_px FROM cur))
    ),
    0
  );
$$;

CREATE OR REPLACE FUNCTION anthem.daily_gift_total(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(SUM(price_px),0)::int FROM public.gift_transactions
  WHERE sender_id = _uid AND created_at >= date_trunc('day', now());
$$;

-- ============================================================
-- 8. send_gift v2: full AML checks
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.send_gift(_recipient_id uuid, _gift_id uuid, _message text DEFAULT '', _project_id uuid DEFAULT NULL)
RETURNS gift_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  g public.gifts;
  tx public.gift_transactions;
  cfg public.gift_limits_config;
  sender_profile public.profiles;
  recipient_profile public.profiles;
  available int;
  daily int;
  velocity int;
  daily_cap int;
  circular_count int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF uid = _recipient_id THEN RAISE EXCEPTION 'INVALID: ส่งให้ตัวเองไม่ได้'; END IF;

  SELECT * INTO cfg FROM public.gift_limits_config WHERE id = 1;
  SELECT * INTO g FROM public.gifts WHERE id = _gift_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID: ไม่พบของขวัญ'; END IF;

  SELECT * INTO sender_profile FROM public.profiles WHERE id = uid;
  SELECT * INTO recipient_profile FROM public.profiles WHERE id = _recipient_id;
  IF recipient_profile.id IS NULL THEN RAISE EXCEPTION 'INVALID: ไม่พบผู้รับ'; END IF;

  -- 1. Frozen check
  IF sender_profile.account_status <> 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีของคุณถูกระงับชั่วคราว';
  END IF;
  IF recipient_profile.account_status = 'frozen' THEN
    RAISE EXCEPTION 'RECIPIENT_FROZEN: ผู้รับถูกระงับบัญชี';
  END IF;

  -- 2. Account age
  IF sender_profile.created_at > now() - make_interval(hours => cfg.min_account_age_hours) THEN
    RAISE EXCEPTION 'NEW_ACCOUNT: บัญชีใหม่เกินไป กรุณารออย่างน้อย % ชั่วโมง', cfg.min_account_age_hours;
  END IF;

  PERFORM public.ensure_wallet(uid);
  PERFORM public.ensure_wallet(_recipient_id);

  -- 3. Available balance (purchased_px past holding)
  available := public.available_purchased_px(uid);
  IF available < g.price_px THEN
    RAISE EXCEPTION 'HOLDING_PERIOD: ยอดพร้อมใช้ % px ไม่พอ (รอ holding 24 ชม.)', available;
  END IF;

  -- 4. Daily limit
  daily := public.daily_gift_total(uid);
  daily_cap := CASE WHEN sender_profile.is_verified THEN cfg.daily_limit_verified ELSE cfg.daily_limit_unverified END;
  IF daily + g.price_px > daily_cap THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: เกินเพดานต่อวัน (% px)%', daily_cap,
      CASE WHEN sender_profile.is_verified THEN '' ELSE ' — ยืนยันตัวตนเพื่อเพิ่มเพดาน' END;
  END IF;

  -- 5. Velocity
  SELECT COUNT(*) INTO velocity FROM public.gift_transactions
    WHERE sender_id = uid AND created_at > now() - interval '1 hour';
  IF velocity >= cfg.velocity_per_hour THEN
    RAISE EXCEPTION 'VELOCITY: ส่งของขวัญถี่เกินไป กรุณารอสักครู่';
  END IF;

  -- 6. Circular pattern flag (non-blocking)
  SELECT COUNT(*) INTO circular_count FROM public.gift_transactions
    WHERE sender_id = _recipient_id AND recipient_id = uid
      AND created_at > now() - interval '7 days';
  IF circular_count > 0 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (uid, 'circular_transfer', 'medium',
      jsonb_build_object('counterparty', _recipient_id, 'reverse_count', circular_count, 'amount_px', g.price_px));
  END IF;

  -- 7. Execute transfer
  UPDATE public.wallets
    SET purchased_px = purchased_px - g.price_px,
        lifetime_spent_px = lifetime_spent_px + g.price_px,
        updated_at = now()
    WHERE user_id = uid;
  UPDATE public.wallets
    SET earned_px = earned_px + g.price_px,
        lifetime_earned_px = lifetime_earned_px + g.price_px,
        updated_at = now()
    WHERE user_id = _recipient_id;

  INSERT INTO public.gift_transactions(sender_id, recipient_id, gift_id, price_px, message, project_id)
    VALUES (uid, _recipient_id, _gift_id, g.price_px, COALESCE(_message,''), _project_id)
    RETURNING * INTO tx;
  RETURN tx;
END $$;

-- ============================================================
-- 9. request_cashout v2: earned_px only + KYC required
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS cashout_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  prof public.profiles;
  earned int;
  fee int;
  net int;
  c public.cashout_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF _amount_px < 1000 THEN RAISE EXCEPTION 'INVALID: ขั้นต่ำ 1000 px'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF NOT prof.is_verified THEN
    RAISE EXCEPTION 'KYC_REQUIRED: ต้องยืนยันตัวตนก่อน cashout';
  END IF;
  IF prof.account_status <> 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีถูกระงับ';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT earned_px INTO earned FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF earned < _amount_px THEN
    RAISE EXCEPTION 'INSUFFICIENT_EARNED: ยอด earned %px ไม่พอ (cashout เฉพาะ px ที่ได้รับจากของขวัญ)', earned;
  END IF;

  fee := FLOOR(_amount_px * 0.15)::int;
  net := _amount_px - fee;

  UPDATE public.wallets SET earned_px = earned_px - _amount_px, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.cashout_requests(user_id, gross_px, fee_px, net_px, bank_info, status, processed_at)
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info,'{}'::jsonb), 'mock_paid', now())
    RETURNING * INTO c;
  RETURN c;
END $$;

-- ============================================================
-- 10. topup_wallet_mock v2: enforce max + holding
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.topup_wallet_mock(_amount_px integer)
RETURNS wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  cfg public.gift_limits_config;
  prof public.profiles;
  w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  SELECT * INTO cfg FROM public.gift_limits_config WHERE id = 1;
  IF _amount_px IS NULL OR _amount_px <= 0 OR _amount_px > cfg.max_topup_per_tx THEN
    RAISE EXCEPTION 'INVALID: จำนวนไม่ถูกต้อง (สูงสุด % px/ครั้ง)', cfg.max_topup_per_tx;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof.account_status <> 'active' THEN RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีถูกระงับ'; END IF;

  PERFORM public.ensure_wallet(uid);
  UPDATE public.wallets
    SET purchased_px = purchased_px + _amount_px, updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;
  INSERT INTO public.wallet_topups(user_id, amount_px, available_at)
    VALUES (uid, _amount_px, now() + make_interval(hours => cfg.hold_hours));
  RETURN w;
END $$;

-- ============================================================
-- 11. KYC RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.submit_kyc_request(_contact_note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); r public.kyc_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  INSERT INTO public.kyc_requests(user_id, contact_note)
    VALUES (uid, COALESCE(_contact_note,''))
    RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION anthem.admin_approve_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.kyc_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.kyc_requests
    SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_request_id RETURNING * INTO r;
  UPDATE public.profiles SET is_verified=true, verified_at=now(), verified_by=auth.uid() WHERE id = r.user_id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'kyc_approve', 'kyc_request', _request_id::text, jsonb_build_object('user_id', r.user_id));
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION anthem.admin_reject_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.kyc_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.kyc_requests
    SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_request_id RETURNING * INTO r;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'kyc_reject', 'kyc_request', _request_id::text, jsonb_build_object('user_id', r.user_id, 'note', _note));
  RETURN r;
END $$;

-- ============================================================
-- 12. Account freeze
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.admin_freeze_account(_user_id uuid, _reason text)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET account_status='frozen', frozen_at=now(), frozen_reason=COALESCE(_reason,'')
    WHERE id=_user_id RETURNING * INTO p;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'account_freeze', 'profile', _user_id::text, jsonb_build_object('reason', _reason));
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION anthem.admin_unfreeze_account(_user_id uuid)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET account_status='active', frozen_at=NULL, frozen_reason=''
    WHERE id=_user_id RETURNING * INTO p;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'account_unfreeze', 'profile', _user_id::text, '{}'::jsonb);
  RETURN p;
END $$;

-- ============================================================
-- 13. AML flag resolution
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.admin_resolve_aml_flag(_flag_id uuid, _action text, _note text DEFAULT '')
RETURNS aml_flags LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.aml_flags; new_status text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('dismiss','escalate','freeze') THEN RAISE EXCEPTION 'invalid action'; END IF;
  new_status := CASE WHEN _action='dismiss' THEN 'dismissed' ELSE 'actioned' END;
  UPDATE public.aml_flags
    SET status=new_status, reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_flag_id RETURNING * INTO f;
  IF _action = 'freeze' THEN
    UPDATE public.profiles SET account_status='frozen', frozen_at=now(), frozen_reason='AML: '||f.flag_type WHERE id=f.user_id;
  ELSIF _action = 'escalate' THEN
    UPDATE public.profiles SET account_status='under_review' WHERE id=f.user_id;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'aml_'||_action, 'aml_flag', _flag_id::text, jsonb_build_object('user_id', f.user_id, 'type', f.flag_type));
  RETURN f;
END $$;

-- ============================================================
-- 14. Risk score
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.calculate_risk_score(_uid uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  age_hours numeric;
  velocity_7d int;
  flag_count int;
  new_recipients int;
  score int := 0;
BEGIN
  SELECT EXTRACT(EPOCH FROM (now() - created_at))/3600 INTO age_hours FROM public.profiles WHERE id=_uid;
  IF age_hours < 24 THEN score := score + 30;
  ELSIF age_hours < 168 THEN score := score + 15; END IF;

  SELECT COUNT(*) INTO velocity_7d FROM public.gift_transactions
    WHERE sender_id=_uid AND created_at > now() - interval '7 days';
  IF velocity_7d > 50 THEN score := score + 25;
  ELSIF velocity_7d > 20 THEN score := score + 10; END IF;

  SELECT COUNT(*) INTO flag_count FROM public.aml_flags
    WHERE user_id=_uid AND status IN ('open','reviewing');
  score := score + LEAST(flag_count * 15, 30);

  SELECT COUNT(DISTINCT recipient_id) INTO new_recipients FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.recipient_id
    WHERE g.sender_id=_uid AND g.created_at > now() - interval '7 days'
      AND p.created_at > now() - interval '7 days';
  IF new_recipients >= 5 THEN score := score + 15; END IF;

  RETURN LEAST(score, 100);
END $$;

-- ============================================================
-- 15. Velocity/burst triggers
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.detect_gift_anomaly()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  sender_count int;
  recipient_new_senders int;
BEGIN
  -- Velocity: sender > 10/hour
  SELECT COUNT(*) INTO sender_count FROM public.gift_transactions
    WHERE sender_id=NEW.sender_id AND created_at > now() - interval '1 hour';
  IF sender_count > 10 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (NEW.sender_id, 'velocity', 'high',
      jsonb_build_object('count_1h', sender_count, 'last_tx_id', NEW.id));
  END IF;

  -- New account burst: recipient gets from ≥5 senders created <24h
  SELECT COUNT(DISTINCT g.sender_id) INTO recipient_new_senders
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.sender_id
    WHERE g.recipient_id=NEW.recipient_id
      AND g.created_at > now() - interval '24 hours'
      AND p.created_at > now() - interval '24 hours';
  IF recipient_new_senders >= 5 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (NEW.recipient_id, 'new_account_burst', 'high',
      jsonb_build_object('new_senders_24h', recipient_new_senders));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_detect_gift_anomaly ON shared.gift_transactions;
CREATE TRIGGER trg_detect_gift_anomaly
  AFTER INSERT ON shared.gift_transactions
  FOR EACH ROW EXECUTE FUNCTION anthem.detect_gift_anomaly();

-- ============================================================
-- 16. Realtime publication for aml_flags + kyc_requests
-- ============================================================
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.aml_flags; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.kyc_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- ============================================================
-- 17. Admin overview RPC for AML dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION anthem.admin_aml_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'flags_open', (SELECT COUNT(*) FROM public.aml_flags WHERE status='open'),
    'flags_critical', (SELECT COUNT(*) FROM public.aml_flags WHERE status='open' AND severity IN ('high','critical')),
    'frozen_accounts', (SELECT COUNT(*) FROM public.profiles WHERE account_status='frozen'),
    'under_review', (SELECT COUNT(*) FROM public.profiles WHERE account_status='under_review'),
    'high_risk_users', (SELECT COUNT(*) FROM public.profiles WHERE risk_score >= 70),
    'kyc_pending', (SELECT COUNT(*) FROM public.kyc_requests WHERE status='pending'),
    'kyc_approved_total', (SELECT COUNT(*) FROM public.kyc_requests WHERE status='approved')
  ) INTO r;
  RETURN r;
END $$;


-- ── 20260604120000_unified_ecosystem_subscription.sql ──
-- skipped 20260604120000_unified_ecosystem_subscription.sql (subscription merge in 20260606120100)


-- ── 20260604130100_seed_community_catalog.sql ──
-- skipped seed migration 20260604130100_seed_community_catalog.sql


-- ── 20260604180000_notifications_cashout_prep.sql ──
-- Notification deep links, gift/follow/cashout alerts, cashout pending (pre-Stripe)

-- 1) Fix hire/collab notification links
CREATE OR REPLACE FUNCTION anthem.notify_on_hire_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
BEGIN
  PERFORM shared.push_notification(
    NEW.freelancer_id,
    'anthem',
    'hire_request',
    'มีคำขอจ้างงานใหม่',
    COALESCE(NEW.client_name, '') || ' ส่งคำขอจ้างงาน: ' || COALESCE(NEW.project_title, ''),
    '/portfolio/manage?focus=hiring',
    jsonb_build_object('request_id', NEW.id, 'project_title', NEW.project_title)
  );
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION anthem.notify_on_collab_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'collab_request',
    'มีคำขอร่วมงานใหม่',
    COALESCE(v_sender_name, 'มีคน') || ' ส่งคำขอร่วมงานถึงคุณ',
    '/portfolio/manage?focus=collab',
    jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

-- 2) Gift received
CREATE OR REPLACE FUNCTION anthem.notify_on_gift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_sender_name text;
  v_gift_name text;
  v_link text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT name_th INTO v_gift_name FROM public.gifts WHERE id = NEW.gift_id;
  v_link := CASE
    WHEN NEW.project_id IS NOT NULL THEN '/project/' || NEW.project_id::text
    ELSE '/u/' || NEW.sender_id::text
  END;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'gift_received',
    'ได้รับของขวัญใหม่',
    COALESCE(v_sender_name, 'มีคน') || ' ส่ง ' || COALESCE(v_gift_name, 'ของขวัญ') || ' (' || NEW.price_px::text || ' px)',
    v_link,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'sender_id', NEW.sender_id,
      'gift_id', NEW.gift_id,
      'project_id', NEW.project_id,
      'price_px', NEW.price_px
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_gift ON shared.gift_transactions;
CREATE TRIGGER trg_notify_gift
  AFTER INSERT ON shared.gift_transactions
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_gift();

-- 3) New follower
CREATE OR REPLACE FUNCTION anthem.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_follower_name text;
BEGIN
  SELECT display_name INTO v_follower_name FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM shared.push_notification(
    NEW.following_id,
    'anthem',
    'new_follower',
    'มีผู้ติดตามใหม่',
    COALESCE(v_follower_name, 'มีคน') || ' เริ่มติดตามคุณแล้ว',
    '/u/' || NEW.follower_id::text,
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_follow ON anthem.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON anthem.follows
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_follow();

-- 4) Cashout: queue as pending (admin marks paid later)
CREATE OR REPLACE FUNCTION anthem.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  prof public.profiles;
  earned int;
  fee int;
  net int;
  c public.cashout_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF _amount_px < 1000 THEN RAISE EXCEPTION 'INVALID: ขั้นต่ำ 1000 px'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF NOT prof.is_verified THEN
    RAISE EXCEPTION 'KYC_REQUIRED: ต้องยืนยันตัวตนก่อน cashout';
  END IF;
  IF prof.account_status <> 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีถูกระงับ';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT earned_px INTO earned FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF earned < _amount_px THEN
    RAISE EXCEPTION 'INSUFFICIENT_EARNED: ยอด earned %px ไม่พอ (cashout เฉพาะ px ที่ได้รับจากของขวัญ)', earned;
  END IF;

  fee := FLOOR(_amount_px * 0.15)::int;
  net := _amount_px - fee;

  UPDATE public.wallets SET earned_px = earned_px - _amount_px, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.cashout_requests(user_id, gross_px, fee_px, net_px, bank_info, status, processed_at)
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info, '{}'::jsonb), 'pending', NULL)
    RETURNING * INTO c;
  RETURN c;
END $$;

-- 5) Notify user when admin marks cashout paid
CREATE OR REPLACE FUNCTION anthem.notify_on_cashout_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'mock_paid' THEN
    PERFORM shared.push_notification(
      NEW.user_id,
      'anthem',
      'cashout_paid',
      'ถอนเงินสำเร็จ',
      'โอน ฿' || NEW.net_px::text || ' เข้าบัญชีของคุณแล้ว',
      '/earnings',
      jsonb_build_object('cashout_id', NEW.id, 'net_px', NEW.net_px)
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM shared.push_notification(
      NEW.user_id,
      'anthem',
      'cashout_rejected',
      'คำขอถอนถูกปฏิเสธ',
      'ยอด ' || NEW.gross_px::text || ' px ถูกคืนเข้ากระเป๋า earned แล้ว — ติดต่อทีมงานหากมีคำถาม',
      '/earnings',
      jsonb_build_object('cashout_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_cashout_status ON shared.cashout_requests;
CREATE TRIGGER trg_notify_cashout_status
  AFTER UPDATE OF status ON shared.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_cashout_status();

-- 6) Notify admins on new pending cashout
CREATE OR REPLACE FUNCTION anthem.notify_admins_on_cashout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
DECLARE
  v_admin uuid;
  v_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin,
      'anthem',
      'cashout_pending',
      'คำขอถอนใหม่',
      COALESCE(v_name, 'ผู้ใช้') || ' ขอถอน ' || NEW.gross_px::text || ' px (สุทธิ ฿' || NEW.net_px::text || ')',
      '/admin/gifts',
      jsonb_build_object('cashout_id', NEW.id, 'user_id', NEW.user_id)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_cashout ON shared.cashout_requests;
CREATE TRIGGER trg_notify_admins_cashout
  AFTER INSERT ON shared.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_admins_on_cashout();

-- 7) Notify user their cashout request was queued
CREATE OR REPLACE FUNCTION anthem.notify_on_cashout_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  PERFORM shared.push_notification(
    NEW.user_id,
    'anthem',
    'cashout_pending',
    'รับคำขอถอนแล้ว',
    'คำขอถอน ' || NEW.gross_px::text || ' px อยู่ในคิว — ทีมงานจะดำเนินการเมื่อระบบชำระเงินเปิดใช้งาน',
    '/earnings',
    jsonb_build_object('cashout_id', NEW.id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_cashout_requested ON shared.cashout_requests;
CREATE TRIGGER trg_notify_cashout_requested
  AFTER INSERT ON shared.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_on_cashout_requested();

REVOKE ALL ON FUNCTION anthem.notify_on_gift() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_cashout_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_admins_on_cashout() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.notify_on_cashout_requested() FROM PUBLIC, anon, authenticated;


-- ── 20260604200000_seed_art_design_enriched.sql ──
-- skipped seed migration 20260604200000_seed_art_design_enriched.sql


-- ── 20260604220000_admin_operations.sql ──
-- Admin operations: moderated CRUD + audit log (requires has_role admin)

CREATE OR REPLACE FUNCTION anthem._admin_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN: ต้องเป็น admin';
  END IF;
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION anthem._admin_audit(_action text, _target_type text, _target_id uuid, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- Project: change status or remove
CREATE OR REPLACE FUNCTION anthem.admin_set_project_status(_id uuid, _status text)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE p public.projects;
BEGIN
  PERFORM public._admin_actor();
  IF _status NOT IN ('Published', 'Draft', 'Private') THEN
    RAISE EXCEPTION 'INVALID: สถานะไม่ถูกต้อง';
  END IF;
  UPDATE public.projects SET status = _status, updated_at = now() WHERE id = _id RETURNING * INTO p;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: ไม่พบผลงาน'; END IF;
  PERFORM public._admin_audit('project.set_status', 'project', _id, jsonb_build_object('status', _status));
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_delete_project(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.project_likes WHERE project_id = _id;
  DELETE FROM public.project_bookmarks WHERE project_id = _id;
  DELETE FROM public.project_comments WHERE project_id = _id;
  DELETE FROM public.project_views WHERE project_id = _id;
  DELETE FROM public.collection_items WHERE project_id = _id;
  DELETE FROM public.image_likes WHERE project_id = _id;
  DELETE FROM public.image_shares WHERE project_id = _id;
  DELETE FROM public.gift_transactions WHERE project_id = _id;
  DELETE FROM public.projects WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: ไม่พบผลงาน'; END IF;
  PERFORM public._admin_audit('project.delete', 'project', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_delete_comment(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.project_comments WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('comment.delete', 'project_comment', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_delete_collection(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.collection_items WHERE collection_id = _id;
  DELETE FROM public.collections WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('collection.delete', 'collection', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_set_job_status(_id uuid, _status text)
RETURNS public.job_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE j public.job_posts;
BEGIN
  PERFORM public._admin_actor();
  IF _status NOT IN ('open', 'closed', 'filled') THEN
    RAISE EXCEPTION 'INVALID: สถานะงานไม่ถูกต้อง';
  END IF;
  UPDATE public.job_posts SET status = _status::public.job_status, updated_at = now() WHERE id = _id RETURNING * INTO j;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('job.set_status', 'job_post', _id, jsonb_build_object('status', _status));
  RETURN j;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_set_user_role(_user_id uuid, _role text, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM public._admin_actor();
  IF _role NOT IN ('admin', 'user') THEN RAISE EXCEPTION 'INVALID role'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public._admin_audit('user.grant_role', 'user', _user_id, jsonb_build_object('role', _role));
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role::public.app_role;
    PERFORM public._admin_audit('user.revoke_role', 'user', _user_id, jsonb_build_object('role', _role));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_update_gift_limits(
  _daily_unverified int, _daily_verified int, _velocity int, _hold_hours int, _max_topup int
)
RETURNS public.gift_limits_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE c public.gift_limits_config;
BEGIN
  PERFORM public._admin_actor();
  UPDATE public.gift_limits_config SET
    daily_limit_unverified = _daily_unverified,
    daily_limit_verified = _daily_verified,
    velocity_per_hour = _velocity,
    hold_hours = _hold_hours,
    max_topup_per_tx = _max_topup,
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO c;
  PERFORM public._admin_audit('gift_limits.update', 'gift_limits_config', '00000000-0000-0000-0000-000000000001'::uuid, to_jsonb(c));
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_update_gift(
  _id uuid, _active boolean, _price_px int DEFAULT NULL
)
RETURNS public.gifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE g public.gifts;
BEGIN
  PERFORM public._admin_actor();
  UPDATE public.gifts SET
    active = COALESCE(_active, active),
    price_px = COALESCE(_price_px, price_px)
  WHERE id = _id
  RETURNING * INTO g;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('gift.update', 'gift', _id, jsonb_build_object('active', g.active, 'price_px', g.price_px));
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_reject_cashout(_id uuid, _note text DEFAULT '')
RETURNS public.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE c public.cashout_requests;
BEGIN
  PERFORM public._admin_actor();
  SELECT * INTO c FROM public.cashout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'INVALID: เฉพาะคำขอ pending'; END IF;
  UPDATE public.wallets SET earned_px = earned_px + c.gross_px, updated_at = now() WHERE user_id = c.user_id;
  UPDATE public.cashout_requests SET status = 'rejected', processed_at = now() WHERE id = _id RETURNING * INTO c;
  PERFORM public._admin_audit('cashout.reject', 'cashout_request', _id, jsonb_build_object('note', _note, 'gross_px', c.gross_px));
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.admin_list_notifications(_limit int DEFAULT 100)
RETURNS SETOF public.notifications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public, shared
AS $$
  SELECT n.id, n.user_id, n.app, n.kind, n.title, n.body, n.link, n.metadata,
         n.is_read, n.is_dismissed, n.created_at
  FROM shared.notifications n
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

CREATE OR REPLACE FUNCTION anthem.admin_dismiss_notification(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM public._admin_actor();
  UPDATE shared.notifications SET is_dismissed = true WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('notification.dismiss', 'notification', _id, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION anthem._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_set_project_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_delete_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_delete_comment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_delete_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_set_job_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_set_user_role(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_update_gift_limits(int, int, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_update_gift(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_reject_cashout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_list_notifications(int) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.admin_dismiss_notification(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION anthem.admin_set_project_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_delete_project(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_delete_comment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_delete_collection(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_set_job_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_set_user_role(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_update_gift_limits(int, int, int, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_update_gift(uuid, boolean, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_reject_cashout(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_list_notifications(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anthem.admin_dismiss_notification(uuid) FROM PUBLIC, anon;


-- ── 20260604230000_fix_cashout_paid_status.sql ──
-- Align admin cashout "paid" with pending flow (not only mock_paid)

CREATE OR REPLACE FUNCTION anthem.admin_mark_cashout_paid(_id uuid)
RETURNS public.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE c public.cashout_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO c FROM public.cashout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cashout not found'; END IF;
  IF c.status NOT IN ('pending', 'mock_paid') THEN
    RAISE EXCEPTION 'INVALID: เฉพาะคำขอ pending';
  END IF;
  UPDATE public.cashout_requests
    SET status = 'paid', processed_at = now()
    WHERE id = _id
    RETURNING * INTO c;
  PERFORM public._admin_audit('cashout.mark_paid', 'cashout_request', _id, jsonb_build_object('net_px', c.net_px));
  RETURN c;
END;
$$;


-- ── 20260604240000_public_feed_stats.sql ──
-- Public aggregate stats for homepage hero (bypasses RLS on collab/hiring counts)

CREATE OR REPLACE FUNCTION anthem.public_feed_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT jsonb_build_object(
    'designers', (SELECT COUNT(*)::int FROM public.profiles),
    'projects', (SELECT COUNT(*)::int FROM public.projects WHERE status = 'Published'),
    'collabs', (SELECT COUNT(*)::int FROM public.collab_requests),
    'hires', (SELECT COUNT(*)::int FROM public.hiring_requests)
  );
$$;

GRANT EXECUTE ON FUNCTION anthem.public_feed_stats() TO anon, authenticated;


-- ── 20260604250000_seed_50_users_full_activity.sql ──
-- skipped seed migration 20260604250000_seed_50_users_full_activity.sql


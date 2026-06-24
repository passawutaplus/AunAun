-- 1) Announcements: scheduling
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

CREATE INDEX IF NOT EXISTS announcements_active_window_idx
  ON public.announcements (is_active, start_at, end_at);

-- 2) Storage bucket for announcement banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-banners', 'announcement-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read announcement banners" ON storage.objects;
CREATE POLICY "Public read announcement banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-banners');

-- Admin write/update/delete
DROP POLICY IF EXISTS "Admins upload announcement banners" ON storage.objects;
CREATE POLICY "Admins upload announcement banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update announcement banners" ON storage.objects;
CREATE POLICY "Admins update announcement banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete announcement banners" ON storage.objects;
CREATE POLICY "Admins delete announcement banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

-- 3) Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,           -- conversation owner (the user side)
  sender_id uuid NOT NULL,         -- who actually sent it
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL DEFAULT '',
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON public.chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON public.chat_messages (is_read) WHERE is_read = false;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversation
CREATE POLICY "Users view own chat" ON public.chat_messages
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can send to their own conversation; admins can send to any
CREATE POLICY "Users send own chat" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  (sender_role = 'user' AND auth.uid() = user_id AND auth.uid() = sender_id)
  OR (sender_role = 'admin' AND public.has_role(auth.uid(), 'admin') AND auth.uid() = sender_id)
);

-- Mark read
CREATE POLICY "Users update own chat read" ON public.chat_messages
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins delete chat" ON public.chat_messages
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 5) Storage bucket for chat images (reuse portfolio-images? no — separate, public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;
CREATE POLICY "Public read chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Authed upload chat images" ON storage.objects;
CREATE POLICY "Authed upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners delete chat images" ON storage.objects;
CREATE POLICY "Owners delete chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- 1) Make chat-images private and scope SELECT to owner or admin
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;

CREATE POLICY "Chat images readable by owner or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- 2) Restrict Realtime broadcast/presence on job tracker channels
DROP POLICY IF EXISTS "realtime job tracker topics owner only" ON realtime.messages;
CREATE POLICY "realtime job tracker topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'track-%' OR realtime.topic() LIKE 'job-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = split_part(realtime.topic(), '-', 2)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    ELSE false
  END
);

-- 3) Restrict Realtime broadcast/presence on planner channels
DROP POLICY IF EXISTS "realtime planner topics owner only" ON realtime.messages;
CREATE POLICY "realtime planner topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'planner-%' OR realtime.topic() LIKE 'planner-approvals-%' THEN
      split_part(realtime.topic(), '-', 2) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    ELSE false
  END
);

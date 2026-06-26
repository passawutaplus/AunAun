-- Community posts: locked media aspect ratio per post (square | portrait | landscape)
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS media_aspect text NOT NULL DEFAULT 'square';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_media_aspect_chk'
  ) THEN
    ALTER TABLE anthem.community_posts
      ADD CONSTRAINT community_posts_media_aspect_chk
      CHECK (media_aspect IN ('square', 'portrait', 'landscape'));
  END IF;
END $$;

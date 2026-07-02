-- Community posts: locked media aspect ratio per post
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS media_aspect text NOT NULL DEFAULT 'square';

ALTER TABLE anthem.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_media_aspect_chk;

ALTER TABLE anthem.community_posts
  ADD CONSTRAINT community_posts_media_aspect_chk
  CHECK (media_aspect IN ('square', 'portrait', 'portrait916', 'landscape', 'landscape54'));

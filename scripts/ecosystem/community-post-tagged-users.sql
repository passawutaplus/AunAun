-- Community posts: tag mutual-follow users (max enforced in app)
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS tagged_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_community_posts_tagged_users
  ON anthem.community_posts USING GIN (tagged_user_ids);

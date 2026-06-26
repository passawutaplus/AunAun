-- Community posts: separate tool/technology tags (portfolio-style tools[]).

ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS tools text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_community_posts_tools
  ON anthem.community_posts USING gin (tools);

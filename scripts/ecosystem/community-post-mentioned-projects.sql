-- Community posts: optional mentions of author's published portfolio projects (max 3 enforced in app)
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS mentioned_project_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_community_posts_mentioned_projects
  ON anthem.community_posts USING GIN (mentioned_project_ids);

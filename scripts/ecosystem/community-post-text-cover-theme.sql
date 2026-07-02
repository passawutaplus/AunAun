-- Text-only post cover theme (composer picker → feed display)
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS text_cover_theme text;

ALTER TABLE anthem.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_text_cover_theme_chk;

ALTER TABLE anthem.community_posts
  ADD CONSTRAINT community_posts_text_cover_theme_chk
  CHECK (
    text_cover_theme IS NULL
    OR text_cover_theme IN ('ember', 'sunset', 'ocean', 'violet', 'forest', 'slate', 'aplus')
  );

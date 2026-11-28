-- Undo of 20261128100000_redesign_work_image_likes_comment_smiles.
-- Likes per picture and comment smiles are removed. anthem.project_likes (liked the work) is left
-- as it is, so every work keeps its likes on the old pages.
DROP TABLE IF EXISTS anthem.project_comment_smiles;
DROP FUNCTION IF EXISTS public.project_image_like_summary(uuid);
DROP TABLE IF EXISTS anthem.project_image_likes;
DROP FUNCTION IF EXISTS anthem.sync_project_like_from_image_like();

-- chat-images (Solo support chat) and portfolio-images had no server-side size or type limit,
-- so anyone signed in could push arbitrarily large or non-image files into a public bucket.
-- 30MB matches the apps' own raw-photo limit (IMAGE_UPLOAD_MAX_INPUT_MB); images only.
UPDATE storage.buckets
SET file_size_limit = 31457280,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id IN ('chat-images', 'portfolio-images');

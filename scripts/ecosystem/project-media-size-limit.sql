-- Raise project-media upload ceiling to 60MB so Anthem can accept ~50MB videos
-- (client transcodes to <=50MB via ffmpeg.wasm) plus overhead.
--
-- allowed_mime_types is intentionally left NULL: project-media is a shared bucket
-- carrying portfolio images/video/gif/3D, chat attachments (pdf/zip/office/fonts),
-- and published forum files. Type whitelisting is enforced per feature on the client
-- (accept + isVideoFile/isGifFile/model3dFormatFromFile) and by magic-byte checks.
--
-- NOTE: the project-wide "Global file upload limit" (Storage settings) must be >= 60MB
-- for this per-bucket limit to take effect.

UPDATE storage.buckets
SET file_size_limit = 62914560 -- 60 * 1024 * 1024
WHERE id = 'project-media';

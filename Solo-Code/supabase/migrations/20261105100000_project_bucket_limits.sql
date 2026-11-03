-- SEC-16 (pre-launch audit 2026-11-02): server-side upload limits for the two SAMECOR project buckets.
--
-- Until now the size/MIME gates lived only in the client (uploadImage / uploadVideo / uploadProjectGif /
-- uploadProjectModel3d / uploadProjectAsset), so anyone with a session token could PUT any file of any
-- size straight into the PUBLIC `project-media` bucket. `allowed_mime_types` is enforced by Storage on
-- upload only; existing objects (incl. legacy application/octet-stream .stl and mislabelled
-- application/json .webp files) keep working.
--
-- project-media (public, SAMECOR portfolio/chat/studio media under anthem/<user>/...):
--   images, mp4 (uploadVideo / animated GIF → mp4), GIF, PDF and the two 3D formats the editor accepts.
--   60 MB stays (uploadVideo caps at 50 MB after compression; raw photos at 30 MB).
--   NOTE: uploadForumAttachment.ts also writes to project-media with the browser's file.type. The forum
--   is off at launch; when it is switched on, point it at the private `forum-attachments` bucket (which
--   already has the wide allow-list) instead of widening this one.
-- project-assets (private, virus-scanned by scan-project-assets, served via signed URLs):
--   downloadable deliverables — documents, archives, fonts, design files. application/octet-stream is
--   kept because browsers report no type for .psd/.ai/.sketch; the bucket is private and every object
--   goes through the scanner before it is published.

UPDATE storage.buckets
SET file_size_limit = 62914560, -- 60 MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4',
      'application/pdf',
      'model/stl', 'model/obj'
    ]
WHERE id = 'project-media';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB (unchanged)
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf',
      'application/zip', 'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
      'application/octet-stream'
    ]
WHERE id = 'project-assets';

-- Verify (expect both rows with a non-null allowed_mime_types):
-- SELECT id, public, file_size_limit, array_length(allowed_mime_types, 1) AS mimes
--   FROM storage.buckets WHERE id IN ('project-media', 'project-assets');

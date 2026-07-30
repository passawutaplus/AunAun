-- Creator Services gallery (slider media, max 6 in app)
ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS price_min_thb integer NOT NULL DEFAULT 0
  CHECK (price_min_thb >= 0);

COMMENT ON COLUMN anthem.creator_services.gallery_urls IS
  'Up to 6 image/video URLs for service detail slider';

COMMENT ON COLUMN anthem.creator_services.price_min_thb IS
  'Package price range min (THB); price_thb is max';

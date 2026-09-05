-- Ads: custom budget + contact-only inquiry packages

ALTER TABLE anthem.ad_applications
  DROP CONSTRAINT IF EXISTS ad_applications_package_check;

ALTER TABLE anthem.ad_applications
  ADD CONSTRAINT ad_applications_package_check
  CHECK (package IN ('basic', 'standard', 'premium', 'custom', 'inquiry'));

ALTER TABLE anthem.ad_campaigns
  DROP CONSTRAINT IF EXISTS ad_campaigns_package_check;

ALTER TABLE anthem.ad_campaigns
  ADD CONSTRAINT ad_campaigns_package_check
  CHECK (package IN ('basic', 'standard', 'premium', 'custom', 'inquiry'));

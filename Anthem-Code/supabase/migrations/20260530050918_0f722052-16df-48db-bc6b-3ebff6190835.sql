-- 1. Extend ad_application_status with payment states
ALTER TYPE ad_application_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE ad_application_status ADD VALUE IF NOT EXISTS 'paid';

-- 2. Extend ad_event_type with 'interest' for detail page
ALTER TYPE ad_event_type ADD VALUE IF NOT EXISTS 'interest';

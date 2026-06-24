-- Custom document branding (Pro+): colors + portal options stored on profile
alter table public.profiles
  add column if not exists document_theme jsonb not null default '{}'::jsonb;

comment on column public.profiles.document_theme is
  'User document theme: primary, invoiceColor, receiptColor, briefAccent, unifiedColors, portalShowLogo, portalWelcomeMessage';

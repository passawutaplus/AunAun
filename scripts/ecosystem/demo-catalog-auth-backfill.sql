-- Backfill auth.users for demo catalog profiles that have public.profiles but no auth row.
-- Fixes hire/collab FK: hiring_requests_freelancer_id_fkey / collab_requests_recipient_id_fkey
-- Idempotent: ON CONFLICT DO NOTHING

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.user_id, p.email, p.display_name, p.username
    FROM public.profiles p
    WHERE p.user_id::text LIKE '00000000-0000-0000-0000-00000000a0%'
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
      AND p.email IS NOT NULL
      AND btrim(p.email) <> ''
  LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      r.user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      r.email,
      crypt('an1hem-demo-seed', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', r.display_name, 'username', r.username),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      r.user_id,
      r.user_id,
      jsonb_build_object('sub', r.user_id::text, 'email', r.email),
      'email',
      r.user_id::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END
$backfill$;

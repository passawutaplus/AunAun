-- Seed mock auth users so we can attach mock profiles and data for testing.
DO $$
DECLARE
  i int;
  uid uuid;
  uname text;
  usernames text[] := ARRAY['nara_illust','kit_motion','ploy_ux','noom_photo','ben_3d','mark_dev','aim_brand','ploen_video','write_co','kim_game','tan_arch','fern_logo','jay_music','mint_uxr','oat_dev','pim_illust','ton_anim','ice_social','art_paint','dev_ops'];
BEGIN
  FOR i IN 0..19 LOOP
    uid := ('00000000-0000-0000-0000-00000000a0' || lpad(to_hex(i),2,'0'))::uuid;
    uname := usernames[i+1];
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated','authenticated', uname || '@mock.so1o', crypt('Mockpass123!', gen_salt('bf')), now(), now() - interval '60 days', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', uname), false,'','','','')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
-- ลบข้อมูล demo ก่อน production (รันทีละบล็อก — ตรวจ FK)
-- ครอบคลุม users 0..49 (@demo.pixel100.com และ legacy @demo.an1hem.app)

DELETE FROM shared.notifications WHERE id::text LIKE '00000000-0000-0000-000e-%';
DELETE FROM public.messages WHERE id::text LIKE '00000000-0000-0000-000d-%';
DELETE FROM public.conversations WHERE id::text LIKE '00000000-0000-0000-000c-%';
DELETE FROM public.job_applications WHERE id::text LIKE '00000000-0000-0000-000b-%';
DELETE FROM public.gift_transactions WHERE id::text LIKE '00000000-0000-0000-000a-%';
DELETE FROM public.inspire_items WHERE board_id::text LIKE '00000000-0000-0000-0009-%';
DELETE FROM public.inspire_boards WHERE id::text LIKE '00000000-0000-0000-0009-%';
DELETE FROM public.collection_items WHERE collection_id::text LIKE '00000000-0000-0000-0008-1%';
DELETE FROM public.collections WHERE id::text LIKE '00000000-0000-0000-0008-1%';
DELETE FROM public.wallet_topups WHERE id::text LIKE '00000000-0000-0000-0008-0%';
DELETE FROM public.hiring_requests WHERE id::text LIKE '00000000-0000-0000-0006-%';
DELETE FROM public.collab_requests WHERE id::text LIKE '00000000-0000-0000-0005-%';
DELETE FROM public.project_comments WHERE id::text LIKE '00000000-0000-0000-0007-%';
DELETE FROM public.ad_events WHERE ad_id::text LIKE '00000000-0000-0000-0004-%';
DELETE FROM public.ad_campaigns WHERE id::text LIKE '00000000-0000-0000-0004-%' OR advertiser_user_id::text LIKE '00000000-0000-0000-0000-00000000a0%';
DELETE FROM public.project_likes WHERE project_id::text LIKE '00000000-0000-0000-0002-%';
DELETE FROM public.follows WHERE follower_id::text LIKE '00000000-0000-0000-0000-00000000a0%' OR following_id::text LIKE '00000000-0000-0000-0000-00000000a0%';
DELETE FROM public.projects WHERE id::text LIKE '00000000-0000-0000-0002-%';
DELETE FROM public.job_posts WHERE id::text LIKE '00000000-0000-0000-0003-%';
DELETE FROM public.studio_members WHERE studio_id::text LIKE '00000000-0000-0000-0001-%';
DELETE FROM public.studios WHERE id::text LIKE '00000000-0000-0000-0001-%';
DELETE FROM public.wallets WHERE user_id::text LIKE '00000000-0000-0000-0000-00000000a0%';
DELETE FROM public.profiles WHERE id::text LIKE '00000000-0000-0000-0000-00000000a0%';

-- ลบ auth.users ที่ email LIKE '%@demo.pixel100.com' หรือ '%@demo.an1hem.app' ผ่าน Dashboard → Authentication

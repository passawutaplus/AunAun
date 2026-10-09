-- BEFORE the 4 migrations: reproduce the problems against production's CURRENT behaviour.
\set A '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set B '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''
\set ADMIN '''cccccccc-cccc-4ccc-8ccc-cccccccccccc'''

insert into public.user_roles values (:ADMIN, 'admin');
grant select on oracle to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset

-- 1) buyer-controlled money
insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version, deposit_percent)
values (:A, :B, 'awaiting_payment', 100000, 1, 999999999, 0, 0, 'x', 100);
select t.ok('BEFORE: client can set buyer_pays=1 on a 100000-satang job (vulnerable)',
  (select buyer_pays_satang = 1 from shared.hire_orders where buyer_id = :A order by created_at desc limit 1));

-- 2) forum attachment scan gate
insert into anthem.forum_attachments(author_id, kind, file_name, scan_status) values (:A, 'file', 'evil.exe', 'clean');
select t.ok('BEFORE: author can insert an attachment already marked clean (vulnerable)',
  (select scan_status = 'clean' from anthem.forum_attachments where file_name = 'evil.exe'));

-- 3) project counters
reset role;
insert into anthem.projects(owner_id, status, title) values (:A, 'Published', 'p1');
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false) \gset
update anthem.projects set views = 9999, likes = 9999 where owner_id = :A;
select t.ok('BEFORE: owner can inflate views/likes directly (vulnerable)',
  (select views = 9999 and likes = 9999 from anthem.projects where title = 'p1'));

-- 4) report + unsend are broken
select t.throws('BEFORE: create_report fails (anthem.user_reports missing)',
  $q$ select public.create_report('project', gen_random_uuid(), null, 'spam') $q$, 'user_reports');
select t.throws('BEFORE: unsend_message does not exist',
  $q$ select public.unsend_message(gen_random_uuid()) $q$, 'unsend_message');

reset role;

-- 5) any chat participant can rewrite / re-attribute the OTHER side's messages
insert into shared.conversation_members values ('d0000000-0000-4000-8000-000000000001', :A), ('d0000000-0000-4000-8000-000000000001', :B);
insert into shared.messages(id, conversation_id, sender_id, content) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', :A, 'original from A');
set role authenticated;
select set_config('request.jwt.claim.sub', :B, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
update shared.messages set content = 'edited by B', sender_id = :B where id = 'e0000000-0000-4000-8000-000000000001';
select t.ok('BEFORE: participant B can rewrite A''s message and take over sender_id (vulnerable)',
  (select content = 'edited by B' and sender_id = :B::uuid from shared.messages where id = 'e0000000-0000-4000-8000-000000000001'));
reset role;

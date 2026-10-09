-- AFTER the 4 migrations.
\set A '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set B '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''
\set ADMIN '''cccccccc-cccc-4ccc-8ccc-cccccccccccc'''

-- ============ MONEY (201000) ============
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset

-- wrong client amounts must be overwritten: job 100000, WHT 3000, deposit 100 => pays 97000, fee 10000, net 87000
insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, card_surcharge_satang, fee_version, wht_satang, deposit_percent, balance_due_satang)
values (:A, :B, 'awaiting_payment', 100000, 1, 999999999, 0, 1, 5000, 'x', 3000, 100, 777);
select t.ok('AFTER: wrong client amounts are corrected by the DB (pays 97000 / fee 10000 / net 87000 / surcharge 0 / fee% 10 / balance 0)',
  (select buyer_pays_satang = 97000 and platform_fee_satang = 10000 and seller_net_satang = 87000
          and card_surcharge_satang = 0 and platform_fee_percent = 10 and balance_due_satang = 0
     from shared.hire_orders where job_price_satang = 100000 and wht_satang = 3000 order by created_at desc limit 1));

-- WHT above 5% is clamped; deposit 0 is clamped to 1; null deposit => 100
insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version, wht_satang, deposit_percent)
values (:A, :B, 'draft', 200000, 1, 1, 0, 0, 'x', 150000, 0);
select t.ok('AFTER: WHT 75% clamped to 5% (10000) and deposit 0 clamped to 1%',
  (select wht_satang = 10000 and deposit_percent = 1 from shared.hire_orders where job_price_satang = 200000 order by created_at desc limit 1));

insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version, wht_satang, deposit_percent)
values (:A, :B, 'draft', 300000, 1, 1, 0, 0, 'x', -500, null);
select t.ok('AFTER: negative WHT -> 0, null deposit -> 100%, pays full 300000',
  (select wht_satang = 0 and deposit_percent = 100 and buyer_pays_satang = 300000 from shared.hire_orders where job_price_satang = 300000));

-- negative job price is rejected by the prod CHECK constraint
select t.throws('AFTER: negative job price rejected (prod CHECK job_price_satang >= 0)',
  format($q$ insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang, platform_fee_percent, platform_fee_satang, fee_version) values (%L,%L,'draft',-5000,1,1,0,0,'x') $q$, :A, :B), 'hire_orders_job_price_satang_check');

-- quote amount overrides the client job price
reset role;
insert into shared.hire_quotes(id, hiring_request_id, amount_satang, expires_at, created_by)
values ('99999999-9999-4999-8999-999999999999', gen_random_uuid(), 50000, now() + interval '1 day', :B);
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
insert into shared.hire_orders(buyer_id, seller_id, status, quote_id, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version)
values (:A, :B, 'awaiting_payment', '99999999-9999-4999-8999-999999999999', 1, 1, 1, 0, 0, 'x');
select t.ok('AFTER: quote amount 50000 overrides client job price 1 -> pays 50000',
  (select job_price_satang = 50000 and buyer_pays_satang = 50000 and platform_fee_satang = 5000 and seller_net_satang = 45000
     from shared.hire_orders where quote_id = '99999999-9999-4999-8999-999999999999'));

-- forbidden statuses / updates
select t.throws('AFTER: INSERT with status paid_pending is rejected',
  format($q$ insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang, platform_fee_percent, platform_fee_satang, fee_version) values (%L,%L,'paid_pending',1000,1,1,0,0,'x') $q$, :A, :B),
  'FORBIDDEN_HIRE_ORDER_STATUS');
select t.throws('AFTER: UPDATE buyer_pays_satang rejected',
  $q$ update shared.hire_orders set buyer_pays_satang = 1 where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE job_price_satang rejected',
  $q$ update shared.hire_orders set job_price_satang = 1 where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE deposit_percent rejected (new in 201000)',
  $q$ update shared.hire_orders set deposit_percent = 1 where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE amount_paid_satang rejected',
  $q$ update shared.hire_orders set amount_paid_satang = 97000 where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE paid_at rejected',
  $q$ update shared.hire_orders set paid_at = now() where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE buyer_id rejected',
  format($q$ update shared.hire_orders set buyer_id = %L where job_price_satang = 100000 $q$, :B), 'FORBIDDEN_HIRE_ORDER_MONEY');
select t.throws('AFTER: UPDATE status -> paid_pending rejected',
  $q$ update shared.hire_orders set status = 'paid_pending' where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_PAID_STATUS');
select t.throws('AFTER: UPDATE status -> deposit_paid rejected',
  $q$ update shared.hire_orders set status = 'deposit_paid' where job_price_satang = 100000 $q$, 'FORBIDDEN_HIRE_ORDER_PAID_STATUS');
select t.runs('AFTER: harmless UPDATE (metadata, cancel status) still allowed',
  $q$ update shared.hire_orders set metadata = '{"note":"hi"}', status = 'cancelled' where job_price_satang = 100000 $q$);

-- service_role & admin bypass
reset role;
set role service_role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false) \gset
select t.runs('AFTER: service_role may set paid status + amounts (webhook path)',
  $q$ update shared.hire_orders set status = 'paid_pending', amount_paid_satang = 97000, paid_at = now() where job_price_satang = 200000 $q$);
select t.ok('AFTER: service_role values stored untouched',
  (select amount_paid_satang = 97000 and status = 'paid_pending' from shared.hire_orders where job_price_satang = 200000));
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: admin may adjust money',
  $q$ update shared.hire_orders set buyer_pays_satang = 12345 where job_price_satang = 300000 $q$);
reset role;

-- A user who has NOT been granted the flag cannot self-set it through plain SQL in a way that survives:
-- (the flag is transaction-local; PostgREST clients cannot issue set_config.) Documented, not asserted.

-- full oracle comparison against the real fees.ts
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
do $$
declare r record; o shared.hire_orders; bad int := 0; n int := 0;
begin
  for r in select * from oracle loop
    insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
      platform_fee_percent, platform_fee_satang, fee_version, wht_satang, deposit_percent, balance_due_satang)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'awaiting_payment',
            r.job, 1, 999999999, 0, 0, 'x', r.wht, r.dep, 777)
    returning * into o;
    n := n + 1;
    if o.buyer_pays_satang <> r.buyer_pays or o.seller_net_satang <> r.seller_net
       or o.platform_fee_satang <> r.fee or o.balance_due_satang <> r.balance then
      bad := bad + 1;
      raise notice 'MISMATCH job=% wht=% dep=% got(pays=%,net=%,fee=%,bal=%) want(pays=%,net=%,fee=%,bal=%)',
        r.job, r.wht, r.dep, o.buyer_pays_satang, o.seller_net_satang, o.platform_fee_satang, o.balance_due_satang,
        r.buyer_pays, r.seller_net, r.fee, r.balance;
    end if;
  end loop;
  perform t.ok('AFTER: DB money == fees.ts (aplus1-v1, PromptPay) on ' || n || ' generated cases', bad = 0, bad || ' mismatches');
end $$;
reset role;

-- fee % + version come from shared.aplus1_fee_configs
reset role;
update shared.aplus1_fee_configs set platform_fee_percent = 12, version = 'aplus1-v2';
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version) values (:A, :B, 'draft', 123400, 1, 1, 10, 1, 'client-says-v1');
select t.ok('AFTER: config fee 12% / aplus1-v2 is applied (fee 14808, net 108592)',
  (select platform_fee_percent = 12 and fee_version = 'aplus1-v2' and platform_fee_satang = 14808 and seller_net_satang = 108592
     from shared.hire_orders where job_price_satang = 123400));
reset role;
update shared.aplus1_fee_configs set effective_to = now() - interval '1 day';
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
insert into shared.hire_orders(buyer_id, seller_id, status, job_price_satang, buyer_pays_satang, seller_net_satang,
  platform_fee_percent, platform_fee_satang, fee_version) values (:A, :B, 'draft', 234500, 1, 1, 99, 1, 'client-v9');
select t.ok('AFTER: no active config row -> falls back to 10%, keeps client fee_version',
  (select platform_fee_percent = 10 and fee_version = 'client-v9' and platform_fee_satang = 23450 from shared.hire_orders where job_price_satang = 234500));
reset role;
update shared.aplus1_fee_configs set platform_fee_percent = 10, version = 'aplus1-v1', effective_to = null;

-- ============ SCAN STATUS + COUNTERS (200000) ============
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
insert into anthem.forum_attachments(author_id, kind, file_name, scan_status, scan_reason, scanned_at)
values (:A, 'file', 'evil2.exe', 'clean', 'trust me', now());
select t.ok('AFTER: insert as author is forced back to pending (reason/scanned_at cleared)',
  (select scan_status = 'pending' and scan_reason is null and scanned_at is null from anthem.forum_attachments where file_name = 'evil2.exe'));
select t.throws('AFTER: author cannot mark attachment clean',
  $q$ update anthem.forum_attachments set scan_status = 'clean' where file_name = 'evil2.exe' $q$, 'server-managed');
select t.throws('AFTER: author cannot swap storage_path / public_url',
  $q$ update anthem.forum_attachments set storage_path = 'x/other', public_url = 'https://evil' where file_name = 'evil2.exe' $q$, 'server-managed');
select t.throws('AFTER: author cannot change mime_type after scan',
  $q$ update anthem.forum_attachments set mime_type = 'image/png' where file_name = 'evil2.exe' $q$, 'server-managed');
select t.runs('AFTER: author may still rename own attachment (file_name)',
  $q$ update anthem.forum_attachments set file_name = 'renamed.bin' where file_name = 'evil2.exe' $q$);
reset role;
set role service_role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false) \gset
select t.runs('AFTER: service_role (scanner) can set scan_status clean',
  $q$ update anthem.forum_attachments set scan_status = 'clean', scanned_at = now() where file_name = 'renamed.bin' $q$);
reset role;

-- project counters
reset role;
insert into anthem.projects(owner_id, status, title) values (:A, 'Published', 'p1');
update anthem.projects set views = 5, likes = 3 where title = 'p1';
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
update anthem.projects set views = 9999, likes = 9999, title = 'renamed' where title = 'p1';
select t.ok('AFTER: owner direct UPDATE of views/likes is silently reverted, title change still applies',
  (select views = 5 and likes = 3 and title = 'renamed' from anthem.projects where owner_id = :A));
select public.increment_project_view(id) from anthem.projects where owner_id = :A;
select t.ok('AFTER: SECURITY DEFINER counter RPC still increments views (5 -> 6)',
  (select views = 6 from anthem.projects where owner_id = :A));
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false) \gset
update anthem.projects set views = 100 where owner_id = :A;
select t.ok('AFTER: admin can set views directly', (select views = 100 from anthem.projects where owner_id = :A));
reset role;

-- ============ USER REPORTS (202000) ============
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select public.create_report('project', '11111111-1111-4111-8111-111111111111', :B, 'spam', 'looks like spam') as rid \gset
select t.ok('AFTER: create_report works and returns an id', :'rid' is not null);
select t.throws('AFTER: duplicate open report blocked (DUPLICATE)',
  $q$ select public.create_report('project', '11111111-1111-4111-8111-111111111111', null, 'spam') $q$, 'DUPLICATE');
select t.throws('AFTER: cannot report own content',
  format($q$ select public.create_report('project', gen_random_uuid(), %L, 'spam') $q$, :A), 'INVALID');
select t.throws('AFTER: invalid reason rejected',
  $q$ select public.create_report('project', gen_random_uuid(), null, 'because') $q$, 'INVALID');
select t.throws('AFTER: invalid target_type rejected',
  $q$ select public.create_report('nope', gen_random_uuid(), null, 'spam') $q$, 'INVALID');
select t.ok('AFTER: reporter sees own report', (select count(*) = 1 from anthem.user_reports));
select t.throws('AFTER: reporter cannot insert directly (writes only via create_report)',
  format($q$ insert into anthem.user_reports(reporter_id, target_type, target_id, reason) values (%L,'user',gen_random_uuid(),'spam') $q$, :A), 'permission denied');

do $$
declare n int;
begin
  update anthem.user_reports set status = 'resolved', admin_note = 'self-resolve';
  get diagnostics n = row_count;
  perform t.ok('AFTER: reporter cannot update own report status (RLS -> 0 rows)', n = 0, 'rows=' || n);
  delete from anthem.user_reports;
  get diagnostics n = row_count;
  perform t.ok('AFTER: reporter cannot delete reports (RLS -> 0 rows)', n = 0, 'rows=' || n);
end $$;
select t.throws('AFTER: reporter cannot edit ai_priority column (no column grant)',
  $q$ update anthem.user_reports set ai_priority = 0 $q$, 'permission denied');

-- rate limit: 10 per hour
do $$
declare i int; failed text;
begin
  for i in 1..9 loop
    perform public.create_report('project', gen_random_uuid(), null, 'spam');
  end loop;
  begin
    perform public.create_report('project', gen_random_uuid(), null, 'spam');
    failed := 'no error';
  exception when others then failed := sqlerrm;
  end;
  perform t.ok('AFTER: 11th report within an hour hits RATE_LIMIT', failed like 'RATE_LIMIT%', failed);
end $$;
reset role;

-- other user + anon + admin visibility
set role authenticated;
select set_config('request.jwt.claim.sub', :B, false) \gset
select t.ok('AFTER: another user sees none of A''s reports', (select count(*) = 0 from anthem.user_reports));
select public.create_report('user', '22222222-2222-4222-8222-222222222222', null, 'harassment') as rid_b \gset
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false) \gset
select t.ok('AFTER: admin sees all reports (10 from A + 1 from B)', (select count(*) = 11 from anthem.user_reports));
update anthem.user_reports set status = 'resolved', admin_note = 'ok', resolved_by = :ADMIN, resolved_at = now() where id = :'rid_b';
select t.ok('AFTER: admin can resolve; updated_at trigger fires',
  (select status = 'resolved' and updated_at >= created_at from anthem.user_reports where id = :'rid_b'));
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :B, false) \gset
select t.runs('AFTER: after resolution B may report same target again (partial unique index)',
  $q$ select public.create_report('user', '22222222-2222-4222-8222-222222222222', null, 'harassment') $q$);
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
select t.throws('AFTER: anon cannot read user_reports', $q$ select * from anthem.user_reports $q$, 'permission denied');
select t.throws('AFTER: anon cannot call create_report',
  $q$ select public.create_report('project', gen_random_uuid(), null, 'spam') $q$, 'AUTH');
reset role;

-- ============ UNSEND (203000) ============
insert into shared.messages(id, conversation_id, sender_id, content, created_at, message_type) values
 ('a0000000-0000-4000-8000-000000000001', gen_random_uuid(), :A, 'recent', now(), 'text'),
 ('a0000000-0000-4000-8000-000000000002', gen_random_uuid(), :B, 'theirs', now(), 'text'),
 ('a0000000-0000-4000-8000-000000000003', gen_random_uuid(), :A, 'old', now() - interval '25 hours', 'text'),
 ('a0000000-0000-4000-8000-000000000004', gen_random_uuid(), :A, 'sys', now(), 'system'),
 ('a0000000-0000-4000-8000-000000000005', gen_random_uuid(), :A, 'already', now(), 'text'),
 ('a0000000-0000-4000-8000-000000000006', gen_random_uuid(), :A, 'edge-23h', now() - interval '23 hours 59 minutes', 'text');
update shared.messages set deleted_at = now() where id = 'a0000000-0000-4000-8000-000000000005';

set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: unsend own recent message', $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000001') $q$);
reset role;
select t.ok('AFTER: deleted_at set on unsent message',
  (select deleted_at is not null from shared.messages where id = 'a0000000-0000-4000-8000-000000000001'));
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset

select t.runs('AFTER: unsend at 23h59m still allowed', $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000006') $q$);
select t.throws('AFTER: cannot unsend someone else''s message',
  $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000002') $q$, 'UNSEND_NOT_ALLOWED');
select t.throws('AFTER: cannot unsend after 24h',
  $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000003') $q$, 'UNSEND_NOT_ALLOWED');
select t.throws('AFTER: cannot unsend a system message',
  $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000004') $q$, 'UNSEND_NOT_ALLOWED');
select t.throws('AFTER: cannot unsend twice',
  $q$ select public.unsend_message('a0000000-0000-4000-8000-000000000005') $q$, 'UNSEND_NOT_ALLOWED');
select t.throws('AFTER: unknown message id',
  $q$ select public.unsend_message(gen_random_uuid()) $q$, 'UNSEND_NOT_ALLOWED');
reset role;
select t.ok('AFTER: their message untouched', (select deleted_at is null from shared.messages where id = 'a0000000-0000-4000-8000-000000000002'));
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '', false) \gset
select t.throws('AFTER: no uid -> AUTH_REQUIRED', $q$ select public.unsend_message(gen_random_uuid()) $q$, 'AUTH_REQUIRED');
reset role;
set role anon;
select set_config('request.jwt.claim.role', 'anon', false) \gset
select t.throws('AFTER: anon cannot execute unsend_message', $q$ select public.unsend_message(gen_random_uuid()) $q$, 'permission denied');
reset role;

-- ============ MESSAGES (20261009100000) ============
insert into shared.messages(id, conversation_id, sender_id, content) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', :A, 'original from A'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', :B, 'from B');
insert into shared.conversation_members values ('d0000000-0000-4000-8000-000000000001', :A), ('d0000000-0000-4000-8000-000000000001', :B);
set role authenticated;
select set_config('request.jwt.claim.sub', :B, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
do $$
declare n int;
begin
  update shared.messages set content = 'edited by B' where id = 'e0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform t.ok('AFTER: participant B cannot edit A''s message (RLS -> 0 rows)', n = 0, 'rows=' || n);
  update shared.messages set deleted_at = now() where id = 'e0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform t.ok('AFTER: participant B cannot soft-delete A''s message (0 rows)', n = 0, 'rows=' || n);
end $$;
select t.throws('AFTER: nobody can take over sender_id (column privilege)',
  $q$ update shared.messages set sender_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'e0000000-0000-4000-8000-000000000001' $q$, 'permission denied');
select t.ok('AFTER: A''s message content unchanged',
  (select content = 'original from A' and sender_id = :A::uuid from shared.messages where id = 'e0000000-0000-4000-8000-000000000001'));
select public.mark_conversation_read('d0000000-0000-4000-8000-000000000001');
reset role;
select t.ok('AFTER: mark_conversation_read (SECURITY DEFINER) still sets read_at on A''s message',
  (select read_at is not null from shared.messages where id = 'e0000000-0000-4000-8000-000000000001'));
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: sender can still edit own message content (within 24h)',
  $q$ update shared.messages set content = 'A edited' where id = 'e0000000-0000-4000-8000-000000000001' $q$);
select t.throws('AFTER: sender cannot move own message to another conversation',
  $q$ update shared.messages set conversation_id = gen_random_uuid() where id = 'e0000000-0000-4000-8000-000000000001' $q$, 'permission denied');
select t.throws('AFTER: sender cannot rewrite created_at',
  $q$ update shared.messages set created_at = now() where id = 'e0000000-0000-4000-8000-000000000001' $q$, 'permission denied');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: admin can still moderate message content',
  $q$ update shared.messages set content = '[removed]' where id = 'e0000000-0000-4000-8000-000000000002' $q$);
select t.ok('AFTER: admin edit applied', (select content = '[removed]' from shared.messages where id = 'e0000000-0000-4000-8000-000000000002'));
reset role;

-- ============ KYC PRIVATE BUCKET (20261009110000) ============
select t.ok('AFTER: kyc-documents bucket is private, 10 MB, jpeg/pdf only',
  (select not public and file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg','application/pdf']
     from storage.buckets where id = 'kyc-documents'));

set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: owner can upload into own folder',
  format($q$ insert into storage.objects(bucket_id, name, owner) values ('kyc-documents', %L, %L) $q$, :A || '/id_front/a1.jpg', :A));
select t.throws('AFTER: cannot upload into someone else''s folder',
  format($q$ insert into storage.objects(bucket_id, name, owner) values ('kyc-documents', %L, %L) $q$, :B || '/id_front/evil.jpg', :A),
  'row-level security');
select t.throws('AFTER: cannot upload to the bucket root / without a user folder',
  $q$ insert into storage.objects(bucket_id, name, owner) values ('kyc-documents', 'loose.jpg', null) $q$, 'row-level security');
select t.ok('AFTER: owner reads own document', (select count(*) = 1 from storage.objects where bucket_id = 'kyc-documents'));
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :B, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.ok('AFTER: another user sees none of A''s KYC documents', (select count(*) = 0 from storage.objects where bucket_id = 'kyc-documents'));
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.ok('AFTER: admin can read KYC documents (needed to create signed URLs)', (select count(*) = 1 from storage.objects where bucket_id = 'kyc-documents'));
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
select t.throws('AFTER: anon has no access to storage objects', $q$ select * from storage.objects $q$, 'permission denied');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
do $$
declare n int;
begin
  update storage.objects set name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/id_front/replaced.jpg' where bucket_id = 'kyc-documents';
  get diagnostics n = row_count;
  perform t.ok('AFTER: nobody can UPDATE/overwrite a KYC object (no upsert)', n = 0, 'rows=' || n);
  delete from storage.objects where bucket_id = 'kyc-documents';
  get diagnostics n = row_count;
  perform t.ok('AFTER: owner can delete own document while no KYC request is open', n = 1, 'rows=' || n);
end $$;
select t.runs('AFTER: re-upload after delete',
  format($q$ insert into storage.objects(bucket_id, name, owner) values ('kyc-documents', %L, %L) $q$, :A || '/selfie/s1.jpg', :A));
reset role;
insert into shared.kyc_requests(user_id, status) values (:A, 'pending');
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
do $$
declare n int;
begin
  delete from storage.objects where bucket_id = 'kyc-documents';
  get diagnostics n = row_count;
  perform t.ok('AFTER: owner cannot delete documents once the KYC request is pending/approved', n = 0, 'rows=' || n);
end $$;
reset role;

-- ============ ADMIN HELPERS + GRANTS (20261009120000) ============
set role authenticated;
select set_config('request.jwt.claim.sub', :ADMIN, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.runs('AFTER: admin can grant a role (helpers now resolve)',
  format($q$ select anthem.admin_set_user_role(%L, 'admin', true) $q$, :B));
reset role;
select t.ok('AFTER: role row created', (select count(*) = 1 from public.user_roles where user_id = :B::uuid and role = 'admin'));
select t.ok('AFTER: audit row written with the admin as actor',
  (select count(*) >= 1 from shared.admin_audit_log where action = 'user.grant_role' and actor_id = :ADMIN::uuid));
delete from public.user_roles where user_id = :B::uuid;

set role authenticated;
select set_config('request.jwt.claim.sub', :A, false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
select t.throws('AFTER: non-admin is refused (FORBIDDEN)',
  format($q$ select anthem.admin_set_user_role(%L, 'admin', true) $q$, :A), 'FORBIDDEN');
select t.ok('AFTER: non-admin got no role', (select count(*) = 0 from public.user_roles where user_id = :A::uuid and role = 'admin'));
select t.throws('AFTER: users cannot forge audit rows via anthem._admin_audit',
  $q$ select anthem._admin_audit('forged.action', 'user', gen_random_uuid(), '{}'::jsonb) $q$, 'permission denied');
select t.throws('AFTER: users cannot call public._admin_audit either',
  $q$ select public._admin_audit('forged.action', 'user', gen_random_uuid(), '{}'::jsonb) $q$, 'permission denied');
select t.throws('AFTER: users cannot call the actor helper',
  $q$ select public._admin_actor() $q$, 'permission denied');
reset role;
select t.ok('AFTER: no forged audit rows exist', (select count(*) = 0 from shared.admin_audit_log where action = 'forged.action'));
select t.ok('AFTER: anon can no longer execute public.admin_probe', not has_function_privilege('anon', 'public.admin_probe()', 'EXECUTE'));
select t.ok('AFTER: authenticated still can (admin UI keeps working)', has_function_privilege('authenticated', 'public.admin_probe()', 'EXECUTE'));
set role anon;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
select t.throws('AFTER: anon is refused on admin RPCs',
  $q$ select public.admin_probe() $q$, 'permission denied');
reset role;

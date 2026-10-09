-- verify.sql — read-only. Run AFTER apply-all.sql (or after each file). Every row should say pass = true (17 rows).
select * from (
  select 1 as n, '01 forum attachment scan guard trigger' as check,
         exists (select 1 from pg_trigger where tgname = 'trg_guard_forum_attachment_scan' and not tgisinternal) as pass
  union all select 2, '01 forum attachment forced-pending trigger',
         exists (select 1 from pg_trigger where tgname = 'trg_force_forum_attachment_pending' and not tgisinternal)
  union all select 3, '01 project counter guard trigger',
         exists (select 1 from pg_trigger where tgname = 'trg_guard_project_counters' and not tgisinternal)
  union all select 4, '02 money guard reads fee % from aplus1_fee_configs',
         (select pg_get_functiondef(p.oid) ilike '%aplus1_fee_configs%' and pg_get_functiondef(p.oid) ilike '%v_pays%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'shared' and p.proname = 'enforce_hire_order_money_guard')
  union all select 5, '03 anthem.user_reports exists with RLS on',
         coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'anthem' and c.relname = 'user_reports'), false)
  union all select 6, '04 unsend_message: signed-in yes, anon no',
         coalesce((select has_function_privilege('authenticated', p.oid, 'EXECUTE') and not has_function_privilege('anon', p.oid, 'EXECUTE')
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'unsend_message'), false)
  union all select 7, '05 messages: participant-wide UPDATE policy is gone',
         not exists (select 1 from pg_policies where schemaname = 'shared' and tablename = 'messages' and policyname = 'Participants can update messages')
  union all select 8, '05 messages: signed-in users may only UPDATE content / attachment_url / deleted_at',
         (select coalesce(array_agg(column_name::text order by column_name), '{}') = array['attachment_url','content','deleted_at']
            from information_schema.column_privileges
           where table_schema = 'shared' and table_name = 'messages' and grantee = 'authenticated' and privilege_type = 'UPDATE')
  union all select 9, '06 public._admin_actor / _admin_audit exist',
         (select count(*) = 2 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('_admin_actor', '_admin_audit'))
  union all select 10, '06 admin audit helpers are NOT callable by signed-in users',
         coalesce((select not bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE'))
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where p.proname in ('_admin_actor', '_admin_audit') and n.nspname in ('public', 'anthem')), false)
  union all select 11, '06 no admin_* function is executable by anon',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname in ('public', 'anthem') and p.proname like 'admin\_%' and p.prokind = 'f'
                        and has_function_privilege('anon', p.oid, 'EXECUTE'))
  union all select 12, '07 kyc-documents bucket is private, 10 MB, jpeg/pdf',
         coalesce((select not public and file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg','application/pdf']
                     from storage.buckets where id = 'kyc-documents'), false)
  union all select 13, '07 kyc-documents policies (upload / read / delete)',
         (select count(*) = 3 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'kyc documents%')
  union all select 14, 'already applied by hand: _user_rows_bytes is gone',
         not exists (select 1 from pg_proc where proname = '_user_rows_bytes')
  union all select 15, 'already applied by hand: email queue RPCs not callable by anon / signed-in',
         (select not bool_or(has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('enqueue_email', 'read_email_batch', 'move_to_dlq'))
  union all select 16, '08 mock hire payments are OFF (mock_topup_enabled = false)',
         coalesce((select not mock_topup_enabled and not stripe_px_enabled from public.payment_settings where id = 1), false)
  union all select 17, '08 PX / gift mutating RPCs are not callable by signed-in users or anon',
         (select not bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE'))
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where (n.nspname, p.proname) in (('public','send_gift'), ('public','claim_daily_px'), ('public','claim_welcome_mission'), ('anthem','request_cashout')))
) t
order by n;

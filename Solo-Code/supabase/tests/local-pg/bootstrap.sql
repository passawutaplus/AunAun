-- Throwaway Supabase-like bootstrap for testing the 4 review migrations locally.
-- Table shapes copied (read-only) from production zkflkpbmbozrchqncpzi on 2026-10-09.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create publication supabase_realtime;

create schema auth; create schema shared; create schema anthem;
grant usage on schema public, auth, shared, anthem to anon, authenticated, service_role;

-- auth.uid()/auth.role() read the same GUCs PostgREST sets from the JWT.
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create type public.app_role as enum ('admin', 'user');
create table public.user_roles (user_id uuid not null, role public.app_role not null, primary key (user_id, role));
create function public.has_role(_user_id uuid, _role public.app_role) returns boolean
  language sql stable security definer set search_path to 'public' as
  $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table shared.hire_quotes (
  id uuid primary key default gen_random_uuid(),
  hiring_request_id uuid not null, conversation_id uuid,
  version int not null default 1, status text not null default 'sent',
  payload jsonb not null default '{}', deposit_percent numeric not null default 100,
  wht_enabled boolean not null default false, amount_satang bigint not null default 0,
  currency text not null default 'THB', doc_number text,
  expires_at timestamptz not null, decline_reason text, decline_note text,
  created_by uuid not null, accepted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table shared.hire_orders (
  id uuid primary key default gen_random_uuid(),
  hiring_request_id uuid, conversation_id uuid,
  buyer_id uuid not null, seller_id uuid not null,
  status text not null default 'draft',
  job_price_satang bigint not null, buyer_pays_satang bigint not null, seller_net_satang bigint not null,
  platform_fee_percent numeric not null, platform_fee_satang bigint not null,
  card_surcharge_satang bigint not null default 0, fee_version text not null,
  payment_method text, display_currency text default 'THB', fx_snapshot_id uuid,
  currency text not null default 'THB',
  paid_at timestamptz, approved_at timestamptz, available_at timestamptz, cancelled_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  quote_id uuid, amount_paid_satang bigint not null default 0, balance_due_satang bigint not null default 0,
  wht_satang bigint not null default 0, deposit_percent numeric,
  auto_dispute_at timestamptz, work_submitted_at timestamptz, wht_status text default 'none',
  constraint hire_orders_buyer_pays_satang_check check (buyer_pays_satang >= 0),
  constraint hire_orders_job_price_satang_check check (job_price_satang >= 0),
  constraint hire_orders_seller_net_satang_check check (seller_net_satang >= 0));

-- Prod trigger name/definition (from pg_get_triggerdef).
-- The function body is the PRE-fix version currently in production, so we can show before/after.
create function shared.enforce_hire_order_money_guard() returns trigger language plpgsql security definer
set search_path to 'shared', 'public' as $function$
DECLARE
  q_amount bigint;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
     OR current_setting('aplus1.allow_hire_paid', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'awaiting_payment') THEN
      RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_STATUS';
    END IF;
    NEW.paid_at := NULL;
    NEW.amount_paid_satang := 0;
    IF NEW.quote_id IS NOT NULL THEN
      SELECT amount_satang INTO q_amount FROM shared.hire_quotes WHERE id = NEW.quote_id;
      IF q_amount IS NOT NULL AND q_amount > 0 THEN
        NEW.job_price_satang := q_amount;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.job_price_satang IS DISTINCT FROM OLD.job_price_satang
     OR NEW.buyer_pays_satang IS DISTINCT FROM OLD.buyer_pays_satang
     OR NEW.seller_net_satang IS DISTINCT FROM OLD.seller_net_satang
     OR NEW.platform_fee_satang IS DISTINCT FROM OLD.platform_fee_satang
     OR NEW.card_surcharge_satang IS DISTINCT FROM OLD.card_surcharge_satang
     OR NEW.amount_paid_satang IS DISTINCT FROM OLD.amount_paid_satang
     OR NEW.balance_due_satang IS DISTINCT FROM OLD.balance_due_satang
     OR NEW.wht_satang IS DISTINCT FROM OLD.wht_satang
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
  THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_MONEY';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('paid_pending', 'deposit_paid')
     AND OLD.status NOT IN ('paid_pending', 'deposit_paid') THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_PAID_STATUS';
  END IF;
  RETURN NEW;
END;
$function$;
create trigger hire_orders_money_guard before insert or update on shared.hire_orders
  for each row execute function shared.enforce_hire_order_money_guard();

create table shared.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null, sender_id uuid not null, content text not null default '',
  attachment_url text, read_at timestamptz, created_at timestamptz not null default now(),
  reply_to_id uuid, deleted_at timestamptz, message_type text not null default 'text',
  project_id uuid, profile_user_id uuid, service_id uuid);

create table anthem.forum_attachments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid, reply_id uuid, author_id uuid not null, kind text not null, file_name text not null,
  mime_type text not null default 'application/octet-stream', size_bytes bigint not null default 0,
  storage_path text, public_url text, scan_status text not null default 'pending',
  scan_reason text, scanned_at timestamptz, created_at timestamptz not null default now());

create table anthem.projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid, status text, title text,
  views integer default 0, likes integer default 0, created_at timestamptz default now());

-- Counter RPC shaped like prod's SECURITY DEFINER view counter (owner = postgres).
create function public.increment_project_view(p_id uuid) returns void language sql security definer
  set search_path = anthem as $$ update anthem.projects set views = coalesce(views,0)+1 where id = p_id $$;

-- Supabase default privileges: RLS (or triggers) is what limits authenticated, not grants.
grant select, insert, update, delete on all tables in schema shared, anthem, public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- RLS: policies copied from production (pg_policies, 2026-10-09).
alter table shared.hire_orders enable row level security;
create policy hire_orders_insert on shared.hire_orders for insert to authenticated
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy hire_orders_select on shared.hire_orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy hire_orders_update on shared.hire_orders for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

alter table anthem.forum_attachments enable row level security;
create policy fa_admin_select on anthem.forum_attachments for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy fa_delete on anthem.forum_attachments for delete to authenticated using (author_id = auth.uid());
create policy fa_insert on anthem.forum_attachments for insert to authenticated with check (author_id = auth.uid());
create policy fa_select on anthem.forum_attachments for select to anon, authenticated using (scan_status = 'clean' or author_id = auth.uid());
create policy fa_update on anthem.forum_attachments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

alter table anthem.projects enable row level security;
create policy projects_select on anthem.projects for select using (status = 'Published' or owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy projects_insert on anthem.projects for insert to authenticated with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy projects_update on anthem.projects for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- messages: unsend RPC is SECURITY DEFINER so RLS is irrelevant to it; leave RLS off here.

-- test helpers (SECURITY INVOKER on purpose so current_user stays the caller's role)
create schema t;
create table t.results (name text, pass boolean, detail text);
grant usage on schema t to authenticated, anon, service_role;
grant insert on t.results to authenticated, anon, service_role;
create function t.ok(n text, c boolean, d text default '') returns void language sql as
  $$ insert into t.results values (n, coalesce(c,false), d) $$;
create function t.throws(n text, q text, expect text) returns void language plpgsql as $$
begin
  execute q;
  insert into t.results values (n, false, 'no error raised');
exception when others then
  insert into t.results values (n, position(expect in sqlerrm) > 0 or sqlstate = expect, sqlstate||': '||sqlerrm);
end $$;
create function t.runs(n text, q text) returns void language plpgsql as $$
begin
  execute q; insert into t.results values (n, true, '');
exception when others then
  insert into t.results values (n, false, sqlstate||': '||sqlerrm);
end $$;
grant execute on all functions in schema t to authenticated, anon, service_role;

-- ---- added 2026-10-09: fee config + messages RLS (policies/function copied from production) ----
create table shared.aplus1_fee_configs (
  id uuid primary key default gen_random_uuid(), version text not null, created_at timestamptz not null default now(),
  effective_from timestamptz not null default now(), effective_to timestamptz,
  platform_fee_percent numeric not null, card_surcharge_percent numeric not null default 0,
  card_fee_passed_to_buyer boolean not null default true, promptpay_buyer_pays_job_only boolean not null default true);
insert into shared.aplus1_fee_configs(version, effective_from, platform_fee_percent) values ('aplus1-v1', '2026-07-18', 10);

create table shared.conversation_members (conversation_id uuid not null, user_id uuid not null);
create function shared.user_in_conversation(c uuid, u uuid) returns boolean language sql stable security definer
  set search_path = shared as $$ select exists (select 1 from shared.conversation_members where conversation_id = c and user_id = u) $$;
grant execute on function shared.user_in_conversation(uuid, uuid) to authenticated;

alter table shared.messages enable row level security;
create policy "Participants can view messages" on shared.messages for select to authenticated
  using (shared.user_in_conversation(conversation_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));
create policy "Participants can update messages" on shared.messages for update to authenticated
  using (shared.user_in_conversation(conversation_id, auth.uid()) or public.has_role(auth.uid(), 'admin'))
  with check (shared.user_in_conversation(conversation_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));
create policy "Sender can unsend own messages" on shared.messages for update to authenticated
  using (auth.uid() = sender_id and created_at > now() - interval '24 hours') with check (auth.uid() = sender_id);
-- prod grants: authenticated has table-wide UPDATE (matches the blanket grant above); anon only SELECT.

create function public.mark_conversation_read(p_conversation_id uuid) returns void language plpgsql security definer
  set search_path to 'shared', 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT shared.user_in_conversation(p_conversation_id, auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE shared.messages SET read_at = now()
   WHERE conversation_id = p_conversation_id AND sender_id <> auth.uid() AND read_at IS NULL AND deleted_at IS NULL;
END;
$function$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---- added 2026-10-09: storage (KYC bucket) ----
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null, owner uuid, created_at timestamptz not null default now());
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant select on storage.buckets to authenticated, service_role;
alter table storage.objects enable row level security;
create table shared.kyc_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null default 'draft');
grant select, insert, delete on shared.kyc_requests to authenticated, service_role;
-- production state before the fix: KYC files sit in the PUBLIC project-media bucket
insert into storage.buckets values ('project-media', 'project-media', true, 62914560, null);

-- ---- added 2026-10-09: admin helpers (bodies copied from production) ----
create table shared.admin_audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid, action text,
  target_type text, target_id uuid, metadata jsonb, created_at timestamptz not null default now());

create function anthem._admin_actor() returns uuid language plpgsql stable security definer
  set search_path to 'anthem', 'shared', 'public' as $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'FORBIDDEN: ต้องเป็น admin'; END IF;
  RETURN auth.uid();
END;
$function$;
create function anthem._admin_audit(_action text, _target_type text, _target_id uuid, _metadata jsonb default '{}'::jsonb)
  returns void language plpgsql security definer set search_path to 'anthem', 'shared', 'public' as $function$
BEGIN
  INSERT INTO shared.admin_audit_log(actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$function$;
-- production: PUBLIC default execute (authenticated could call both helpers)
grant execute on all functions in schema anthem to authenticated, service_role;

-- the production function that calls the helpers through the (missing) public variant
create function anthem.admin_set_user_role(_user_id uuid, _role text, _grant boolean) returns void language plpgsql
  security definer set search_path to 'anthem', 'shared', 'public' as $function$
BEGIN
  PERFORM public._admin_actor();
  IF _role NOT IN ('admin', 'user') THEN RAISE EXCEPTION 'INVALID role'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public._admin_audit('user.grant_role', 'user', _user_id, jsonb_build_object('role', _role));
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role::public.app_role;
    PERFORM public._admin_audit('user.revoke_role', 'user', _user_id, jsonb_build_object('role', _role));
  END IF;
END;
$function$;

-- a public admin_* RPC that production lets `anon` execute (default PUBLIC grant)
create function public.admin_probe() returns int language sql security definer set search_path = public as $$ select 1 $$;
grant execute on function public.admin_probe() to public;

-- A+ Vault Engine, phase 10: learning loop (capture, digest, behaviour stats). Applied 2026-10-04 as migration vault_engine_learning. Idempotent.
-- Privacy: no user id, no IP, no account join. session_id is a random per-tab id from sessionStorage. Raw rows live 90 days, then only daily aggregates stay.

create table if not exists public.search_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 8 and 40),
  query_text text not null check (char_length(query_text) between 1 and 200),
  parsed jsonb,
  lang_mix text check (lang_mix in ('th', 'en', 'mixed')),
  result_count integer,
  relaxed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists search_events_created_idx on public.search_events (created_at desc);
create index if not exists search_events_session_idx on public.search_events (session_id, created_at);

create table if not exists public.search_daily (
  day date not null,
  query_text text not null,
  searches integer not null default 0,
  zero_results integer not null default 0,
  relaxed integer not null default 0,
  primary key (day, query_text)
);

create table if not exists public.learning_changelog (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  what text not null,
  before jsonb,
  after jsonb,
  reason text
);

alter table public.item_signals
  add column if not exists search_event_id bigint references public.search_events(id) on delete set null,
  add column if not exists position integer;

alter table public.unknown_terms
  add column if not exists example_queries text[] not null default '{}',
  add column if not exists suggested_term_id text;
alter table public.unknown_terms drop constraint if exists unknown_terms_status_check;
alter table public.unknown_terms add constraint unknown_terms_status_check check (status in ('new', 'promoted', 'ignored', 'aliased', 'added'));

alter table public.search_events enable row level security;
alter table public.search_daily enable row level security;
alter table public.learning_changelog enable row level security;

-- Search event capture (service role, called by api/signal.js). Returns the event id so later signals can reference it.
create or replace function public.log_search_event(p_sid text, p_query text, p_parsed jsonb, p_lang text, p_results integer, p_relaxed boolean)
returns bigint
language plpgsql
set search_path = public
as $$
declare new_id bigint;
begin
  insert into public.search_events (session_id, query_text, parsed, lang_mix, result_count, relaxed)
  values (left(p_sid, 40), left(p_query, 200), p_parsed, case when p_lang in ('th', 'en', 'mixed') then p_lang else null end, p_results, coalesce(p_relaxed, false))
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.log_search_event(text, text, jsonb, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.log_search_event(text, text, jsonb, text, integer, boolean) to service_role;

-- Signal tied to the search that showed the item (position = rank on the page).
create or replace function public.log_item_signal(p_item uuid, p_type text, p_tag_ids text[], p_search_event bigint, p_position integer)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_type not in ('view', 'save', 'skip', 'open') then return; end if;
  insert into public.item_signals (item_id, type, tag_ids, search_event_id, position)
  select p_item, p_type, case when p_tag_ids is null then null else p_tag_ids[1:12] end, p_search_event, least(greatest(coalesce(p_position, 0), 0), 500)
  where exists (select 1 from public.discover_items d where d.id = p_item and d.status = 'published');
end;
$$;
revoke all on function public.log_item_signal(uuid, text, text[], bigint, integer) from public, anon, authenticated;
grant execute on function public.log_item_signal(uuid, text, text[], bigint, integer) to service_role;

-- Per-item behaviour counts for the bounded ranking boost (api/search.js reads this only when LEARN_RANK_TUNING is on).
create or replace function public.item_behavior(p_days integer default 180)
returns table (item_id uuid, impressions integer, saves integer, opens integer, last_at timestamptz)
language sql
stable
set search_path = public
as $$
  select s.item_id,
         count(*) filter (where s.type = 'view')::int,
         count(*) filter (where s.type = 'save')::int,
         count(*) filter (where s.type in ('open'))::int,
         max(s.created_at)
  from public.item_signals s
  where s.created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by s.item_id;
$$;
revoke all on function public.item_behavior(integer) from public, anon, authenticated;
grant execute on function public.item_behavior(integer) to service_role;

-- Weekly learning digest, plain SQL, no AI.
create or replace function public.learning_digest(p_days integer default 7)
returns jsonb
language sql
stable
set search_path = public
as $$
  with win as (select now() - make_interval(days => greatest(1, least(p_days, 90))) as since),
  q as (select * from public.search_events e, win where e.created_at >= win.since),
  top_q as (select query_text, count(*)::int n from q group by 1 order by n desc limit 20),
  zero_q as (select query_text, count(*)::int n from q where coalesce(result_count, 0) = 0 group by 1 order by n desc limit 15),
  relaxed_q as (select query_text, count(*)::int n from q where relaxed group by 1 order by n desc limit 15),
  reform as (
    select a.query_text as first_query, b.query_text as then_query, count(*)::int n
    from q a join q b on a.session_id = b.session_id and b.created_at > a.created_at and b.created_at <= a.created_at + interval '60 seconds' and a.query_text <> b.query_text
    group by 1, 2 order by n desc limit 15
  ),
  unknown_by_lang as (
    select lang, term, count from (
      select u.lang, u.term, u.count, row_number() over (partition by u.lang order by u.count desc) rn from public.unknown_terms u where u.status = 'new'
    ) t where rn <= 8
  ),
  sig as (select s.* from public.item_signals s, win where s.created_at >= win.since),
  src as (
    select d.source,
           count(*) filter (where s.type = 'view')::int views,
           count(*) filter (where s.type = 'save')::int saves,
           count(*) filter (where s.type = 'open')::int opens
    from sig s join public.discover_items d on d.id = s.item_id group by d.source
  ),
  src_rep as (
    select d.source, count(*)::int reports from public.discover_reports r join public.discover_items d on d.id = r.item_id, win where r.created_at >= win.since group by d.source
  ),
  thin as (
    select d.id, d.title, count(*)::int saves, cardinality(d.tags_ids) tags
    from sig s join public.discover_items d on d.id = s.item_id
    where s.type = 'save' group by d.id having count(*) >= 3 and cardinality(d.tags_ids) < 6 order by saves desc limit 10
  )
  select jsonb_build_object(
    'days', p_days,
    'searches', (select count(*) from q),
    'top_queries', coalesce((select jsonb_agg(to_jsonb(top_q)) from top_q), '[]'::jsonb),
    'zero_result_queries', coalesce((select jsonb_agg(to_jsonb(zero_q)) from zero_q), '[]'::jsonb),
    'relaxed_queries', coalesce((select jsonb_agg(to_jsonb(relaxed_q)) from relaxed_q), '[]'::jsonb),
    'reformulations', coalesce((select jsonb_agg(to_jsonb(reform)) from reform), '[]'::jsonb),
    'unknown_words', coalesce((select jsonb_agg(to_jsonb(unknown_by_lang)) from unknown_by_lang), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', s.source, 'views', s.views, 'saves', s.saves, 'opens', s.opens, 'reports', coalesce(r.reports, 0))) from src s left join src_rep r using (source)), '[]'::jsonb),
    'saved_but_thin', coalesce((select jsonb_agg(to_jsonb(thin)) from thin), '[]'::jsonb),
    'relax_rate', (select round(avg(case when relaxed then 1 else 0 end)::numeric, 3) from q),
    'zero_rate', (select round(avg(case when coalesce(result_count, 0) = 0 then 1 else 0 end)::numeric, 3) from q)
  );
$$;
revoke all on function public.learning_digest(integer) from public, anon, authenticated;
grant execute on function public.learning_digest(integer) to service_role;

-- Retention: raw search events 90 days (rolled up into daily aggregates first), signals 90 days, old ops rows.
create or replace function public.ops_run_retention()
returns jsonb
language plpgsql
set search_path = public
as $$
declare trash int; signals int; events int; letters int; searches int;
begin
  delete from public.vault_items where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics trash = row_count;
  insert into public.search_daily (day, query_text, searches, zero_results, relaxed)
    select (e.created_at at time zone 'Asia/Bangkok')::date, e.query_text, count(*), count(*) filter (where coalesce(e.result_count, 0) = 0), count(*) filter (where e.relaxed)
    from public.search_events e where e.created_at < now() - interval '90 days' group by 1, 2
    on conflict (day, query_text) do update set searches = public.search_daily.searches + excluded.searches, zero_results = public.search_daily.zero_results + excluded.zero_results, relaxed = public.search_daily.relaxed + excluded.relaxed;
  delete from public.search_events where created_at < now() - interval '90 days';
  get diagnostics searches = row_count;
  delete from public.item_signals where created_at < now() - interval '90 days';
  get diagnostics signals = row_count;
  delete from public.ops_events where created_at < now() - interval '180 days';
  get diagnostics events = row_count;
  delete from public.dead_letters where resolved_at is not null and resolved_at < now() - interval '90 days';
  get diagnostics letters = row_count;
  delete from public.ops_reports where day < current_date - 400;
  return jsonb_build_object('trash_items', trash, 'search_events', searches, 'item_signals', signals, 'ops_events', events, 'dead_letters', letters);
end;
$$;
revoke all on function public.ops_run_retention() from public, anon, authenticated;
grant execute on function public.ops_run_retention() to service_role;

-- Unknown words now keep a few example queries and a free suggestion (nearest existing term), still no user id.
create or replace function public.log_unknown_terms(p_terms jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare t jsonb;
begin
  for t in select * from jsonb_array_elements(p_terms) loop
    if char_length(coalesce(t->>'term', '')) between 2 and 40 and (t->>'lang') in ('th', 'en', 'mixed', 'und') then
      insert into public.unknown_terms (term, lang, count, last_seen, example_queries, suggested_term_id)
      values (lower(t->>'term'), t->>'lang', 1, now(), case when t->>'example' is null then '{}' else array[left(t->>'example', 120)] end, nullif(left(coalesce(t->>'suggested', ''), 80), ''))
      on conflict (term, lang) do update set
        count = public.unknown_terms.count + 1,
        last_seen = now(),
        suggested_term_id = coalesce(public.unknown_terms.suggested_term_id, excluded.suggested_term_id),
        example_queries = case when t->>'example' is null or cardinality(public.unknown_terms.example_queries) >= 3 or left(t->>'example', 120) = any(public.unknown_terms.example_queries) then public.unknown_terms.example_queries else public.unknown_terms.example_queries || left(t->>'example', 120) end;
    end if;
  end loop;
end;
$$;
revoke all on function public.log_unknown_terms(jsonb) from public, anon, authenticated;
grant execute on function public.log_unknown_terms(jsonb) to service_role;

-- Batched impressions (applied as migration vault_engine_learning_views).
create or replace function public.log_item_views(p_ids uuid[], p_search_event bigint default null)
returns void
language sql
set search_path = public
as $$
  insert into public.item_signals (item_id, type, search_event_id, position)
  select d.id, 'view', p_search_event, (u.ord - 1)::int
  from unnest(p_ids[1:40]) with ordinality as u(id, ord)
  join public.discover_items d on d.id = u.id and d.status = 'published';
$$;
revoke all on function public.log_item_views(uuid[], bigint) from public, anon, authenticated;
grant execute on function public.log_item_views(uuid[], bigint) to service_role;

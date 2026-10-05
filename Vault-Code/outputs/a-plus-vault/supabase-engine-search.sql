-- A+ Vault Engine, phase 06: aggregate unknown search words (no user id, no full queries).
-- Applied 2026-10-04 as migration vault_engine_search. Idempotent. Apply after supabase-engine-passport.sql.

create or replace function public.log_unknown_terms(p_terms jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare t jsonb;
begin
  for t in select * from jsonb_array_elements(p_terms) loop
    if char_length(coalesce(t->>'term', '')) between 2 and 40 and (t->>'lang') in ('th', 'en', 'mixed', 'und') then
      insert into public.unknown_terms (term, lang, count, last_seen)
      values (lower(t->>'term'), t->>'lang', 1, now())
      on conflict (term, lang) do update set count = public.unknown_terms.count + 1, last_seen = now();
    end if;
  end loop;
end;
$$;
revoke all on function public.log_unknown_terms(jsonb) from public, anon, authenticated;
grant execute on function public.log_unknown_terms(jsonb) to service_role;

-- Bounded, server-written signal intake (no user id by design): insert through this function only.
create or replace function public.log_item_signal(p_item uuid, p_type text, p_tag_ids text[] default null)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_type not in ('view', 'save', 'skip', 'open') then return; end if;
  insert into public.item_signals (item_id, type, tag_ids)
  select p_item, p_type, case when p_tag_ids is null then null else p_tag_ids[1:12] end
  where exists (select 1 from public.discover_items d where d.id = p_item and d.status = 'published');
end;
$$;
revoke all on function public.log_item_signal(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.log_item_signal(uuid, text, text[]) to service_role;

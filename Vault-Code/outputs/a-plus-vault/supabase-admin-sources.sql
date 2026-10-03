-- A+ Vault admin: bot/source health + copyright compliance monitor. Read-only RPC, super-admin only.
-- Apply after supabase-admin-console.sql and supabase-discover-reports.sql. Idempotent. Not applied automatically.

create or replace function public.vault_admin_source_health()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'sources', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.source)
      from (
        select d.source,
          count(*) filter (where d.status = 'published')::int as published,
          count(*) filter (where d.status = 'pending')::int as pending,
          count(*) filter (where d.status = 'rejected')::int as rejected,
          count(*) filter (where d.status = 'hidden')::int as hidden,
          max(d.published_at) as last_published_at,
          max(d.created_at) as last_seen_at,
          coalesce(sum(r.total), 0)::int as reports,
          coalesce(sum(r.open_n), 0)::int as open_reports,
          coalesce(sum(r.copyright_n), 0)::int as copyright_reports
        from public.discover_items d
        left join (
          select item_id, count(*) as total,
            count(*) filter (where status = 'open') as open_n,
            count(*) filter (where reason = 'copyright') as copyright_n
          from public.discover_reports group by item_id
        ) r on r.item_id = d.id
        group by d.source
      ) t
    ), '[]'::jsonb),
    'licenses', coalesce((
      select jsonb_agg(jsonb_build_object('license', license, 'n', n) order by n desc)
      from (select license, count(*)::int as n from public.discover_items where status = 'published' group by license) x
    ), '[]'::jsonb),
    'violations', jsonb_build_object(
      'published_not_allowed', (select count(*)::int from public.discover_items where status = 'published' and license not in ('cc0', 'pdm', 'cc-by', 'cc-by-sa')),
      'published_no_attribution', (select count(*)::int from public.discover_items where status = 'published' and btrim(attribution) = ''),
      'published_no_source_url', (select count(*)::int from public.discover_items where status = 'published' and source_url !~ '^https://')
    ),
    'copyright_open', (select count(*)::int from public.discover_reports where status = 'open' and reason = 'copyright'),
    'copyright_oldest_open', (select min(created_at) from public.discover_reports where status = 'open' and reason = 'copyright')
  );
end $$;
revoke all on function public.vault_admin_source_health() from public;
grant execute on function public.vault_admin_source_health() to authenticated;

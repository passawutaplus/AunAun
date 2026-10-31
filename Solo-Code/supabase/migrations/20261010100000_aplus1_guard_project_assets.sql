-- Project attachments: only the scan function (service role) may write a scan verdict.
--
-- Before this, `anthem.projects.project_assets` was written by the browser, scan_status included. The scan
-- function only looked at items still marked "pending", so a link the browser had already marked "clean" was
-- never sent to VirusTotal, and a tampered client could mark a file "clean" without it ever being scanned.
--
-- Now: on every write that is not made by the service role, each attachment is either
--   * unchanged (same id, url / storage_path) and already carries a server verdict -> keep that verdict, or
--   * new or changed                                                              -> reset to "pending"
-- and the server-only stamp (server_scanned_at, scan_engine) can never come from the client. The scan function
-- and download-project-asset only trust items that carry the stamp.

create or replace function anthem.guard_project_assets()
returns trigger
language plpgsql
set search_path = anthem, public
as $$
declare
  claims    jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  old_items jsonb := '[]'::jsonb;
  item      jsonb;
  prev      jsonb;
  result    jsonb := '[]'::jsonb;
begin
  -- Edge functions (service role), migrations and the SQL editor are trusted.
  if coalesce(claims ->> 'role', '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.project_assets is null or jsonb_typeof(new.project_assets) <> 'array' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.project_assets is not null and jsonb_typeof(old.project_assets) = 'array' then
    old_items := old.project_assets;
  end if;

  for item in select value from jsonb_array_elements(new.project_assets) loop
    if jsonb_typeof(item) <> 'object' then
      continue;
    end if;

    select o.value into prev
    from jsonb_array_elements(old_items) as o(value)
    where o.value ->> 'id' is not null and o.value ->> 'id' = item ->> 'id'
    limit 1;

    if prev is not null
       and prev ->> 'server_scanned_at' is not null
       and coalesce(prev ->> 'url', '') = coalesce(item ->> 'url', '')
       and coalesce(prev ->> 'storage_path', '') = coalesce(item ->> 'storage_path', '') then
      -- Same attachment, server already judged it: keep the server's verdict, whatever the client sent.
      item := item || jsonb_build_object(
        'scan_status',       prev -> 'scan_status',
        'scan_reason',       coalesce(prev -> 'scan_reason', 'null'::jsonb),
        'scanned_at',        coalesce(prev -> 'scanned_at', 'null'::jsonb),
        'server_scanned_at', prev -> 'server_scanned_at',
        'scan_engine',       coalesce(prev -> 'scan_engine', 'null'::jsonb)
      );
    else
      -- New or changed: no verdict until the scan function has looked at it. A browser-side "blocked" is
      -- allowed to stay (it can only make things stricter); everything else becomes pending.
      item := (item - 'server_scanned_at' - 'scan_engine') || jsonb_build_object(
        'scan_status', case when item ->> 'scan_status' = 'blocked' then 'blocked' else 'pending' end,
        'scan_reason', case when item ->> 'scan_status' = 'blocked' then coalesce(item -> 'scan_reason', 'null'::jsonb) else 'null'::jsonb end,
        'scanned_at',  'null'::jsonb
      );
    end if;

    result := result || jsonb_build_array(item);
  end loop;

  new.project_assets := result;
  return new;
end;
$$;

drop trigger if exists trg_guard_project_assets on anthem.projects;
create trigger trg_guard_project_assets
  before insert or update of project_assets on anthem.projects
  for each row execute function anthem.guard_project_assets();

-- Attachments judged before this migration keep working: give them a stamp marked "legacy". The scan function
-- re-scans anything whose engine is not current the next time the owner saves, upgrading it to the new rules.
update anthem.projects p
set project_assets = (
  select coalesce(jsonb_agg(
    case
      when a.value ->> 'scan_status' in ('clean', 'blocked') and a.value ->> 'server_scanned_at' is null
        then a.value || jsonb_build_object(
          'server_scanned_at', coalesce(a.value -> 'scanned_at', to_jsonb(now())),
          'scan_engine', 'legacy'
        )
      else a.value
    end
    order by a.ord
  ), '[]'::jsonb)
  from jsonb_array_elements(p.project_assets) with ordinality as a(value, ord)
)
where jsonb_typeof(p.project_assets) = 'array' and jsonb_array_length(p.project_assets) > 0;

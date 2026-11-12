-- Fixes from the 2026-11-12 tester run on production.
--
-- 1) New follower / new comment never reached the bell. The inbox UI already renders these
--    (InboxList reads metadata.follower_id / commenter_id / project_id) but nothing created the rows:
--    shared.notifications only ever held chat, KYC, hire and system kinds.
-- 2) public.message_reactions did not exist: the chat reaction button fell back to localStorage,
--    so the other person never saw a reaction, and every chat open logged 404s.
-- 3) anthem.collection_items had no foreign key to anthem.collections, so the API could not join
--    them ("which of my collections hold this work" returned 400) and deleting a collection left
--    its items behind (4 such rows today).

-- ---------------------------------------------------------------------------------------------
-- 1) Follow + comment notifications
-- ---------------------------------------------------------------------------------------------

create or replace function anthem.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  if new.follower_id is null or new.following_id is null or new.follower_id = new.following_id then
    return new;
  end if;

  -- Follow / unfollow / follow again within a week: one notification, not three.
  if exists (
    select 1
    from shared.notifications n
    where n.user_id = new.following_id
      and n.kind = 'social.follow'
      and n.metadata->>'follower_id' = new.follower_id::text
      and n.created_at > now() - interval '7 days'
  ) then
    return new;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.username), ''), 'มีคน')
    into actor_name
  from public.profiles p
  where p.user_id = new.follower_id
  limit 1;

  insert into shared.notifications (user_id, app, kind, title, body, link, metadata)
  values (
    new.following_id,
    'anthem',
    'social.follow',
    coalesce(actor_name, 'มีคน') || ' เริ่มติดตามคุณ',
    '',
    '/u/' || new.follower_id::text,
    jsonb_build_object('follower_id', new.follower_id)
  );
  return new;
exception when others then
  -- A notification must never block the follow itself.
  return new;
end;
$$;

drop trigger if exists trg_notify_new_follower on anthem.follows;
create trigger trg_notify_new_follower
  after insert on anthem.follows
  for each row execute function anthem.notify_new_follower();

create or replace function anthem.notify_project_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  proj record;
  parent_author uuid;
  preview text;
begin
  select p.id, p.owner_id, p.title into proj
  from anthem.projects p
  where p.id = new.project_id;
  if not found then
    return new;
  end if;

  select coalesce(nullif(btrim(pr.display_name), ''), nullif(btrim(pr.username), ''), 'มีคน')
    into actor_name
  from public.profiles pr
  where pr.user_id = new.user_id
  limit 1;
  actor_name := coalesce(actor_name, 'มีคน');
  preview := left(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g'), 140);

  if new.parent_id is not null then
    select c.user_id into parent_author
    from anthem.project_comments c
    where c.id = new.parent_id;
  end if;

  -- The person being replied to.
  if parent_author is not null and parent_author <> new.user_id then
    insert into shared.notifications (user_id, app, kind, title, body, link, metadata)
    values (
      parent_author,
      'anthem',
      'project.comment_reply',
      actor_name || ' ตอบกลับคอมเมนต์ของคุณ',
      preview,
      '/showcase/' || proj.id::text,
      jsonb_build_object('commenter_id', new.user_id, 'project_id', proj.id, 'comment_id', new.id)
    );
  end if;

  -- The owner of the work (unless they wrote it, or already got the reply notification above).
  if proj.owner_id is not null
     and proj.owner_id <> new.user_id
     and proj.owner_id is distinct from parent_author then
    insert into shared.notifications (user_id, app, kind, title, body, link, metadata)
    values (
      proj.owner_id,
      'anthem',
      'project.comment',
      actor_name || ' คอมเมนต์ผลงาน “' || left(coalesce(proj.title, ''), 60) || '”',
      preview,
      '/showcase/' || proj.id::text,
      jsonb_build_object('commenter_id', new.user_id, 'project_id', proj.id, 'comment_id', new.id)
    );
  end if;
  return new;
exception when others then
  -- A notification must never block the comment itself.
  return new;
end;
$$;

drop trigger if exists trg_notify_project_comment on anthem.project_comments;
create trigger trg_notify_project_comment
  after insert on anthem.project_comments
  for each row execute function anthem.notify_project_comment();

revoke all on function anthem.notify_new_follower() from public, anon, authenticated;
revoke all on function anthem.notify_project_comment() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2) Chat message reactions
-- ---------------------------------------------------------------------------------------------

create table if not exists public.message_reactions (
  message_id uuid not null references shared.messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions_select_participants" on public.message_reactions;
create policy "message_reactions_select_participants"
  on public.message_reactions for select to authenticated
  using (
    exists (
      select 1
      from shared.messages m
      where m.id = message_reactions.message_id
        and shared.is_conversation_participant(m.conversation_id)
    )
  );

drop policy if exists "message_reactions_insert_own" on public.message_reactions;
create policy "message_reactions_insert_own"
  on public.message_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from shared.messages m
      where m.id = message_reactions.message_id
        and shared.is_conversation_participant(m.conversation_id)
    )
  );

drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_delete_own"
  on public.message_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.message_reactions from anon;
grant select, insert, delete on public.message_reactions to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) collection_items -> collections
-- ---------------------------------------------------------------------------------------------

-- Items whose collection was already deleted: nobody can see or reach them.
delete from anthem.collection_items ci
where not exists (select 1 from anthem.collections c where c.id = ci.collection_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'anthem.collection_items'::regclass
      and conname = 'collection_items_collection_id_fkey'
  ) then
    alter table anthem.collection_items
      add constraint collection_items_collection_id_fkey
      foreign key (collection_id) references anthem.collections (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_collection_items_collection
  on anthem.collection_items (collection_id);

notify pgrst, 'reload schema';

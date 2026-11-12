-- Follow-up to 20261112110000: the reactions table was created in `public`, but the web client
-- reads every table it has no explicit routing for from the `anthem` schema
-- (src/integrations/supabase/tableRouting.ts), so the chat kept getting 404.
-- Move it; policies, the primary key and the foreign keys move with the table.

do $$
begin
  if to_regclass('anthem.message_reactions') is null and to_regclass('public.message_reactions') is not null then
    alter table public.message_reactions set schema anthem;
  end if;
end $$;

-- Only what the client needs (rows are still limited by the RLS policies).
revoke all on anthem.message_reactions from anon, authenticated;
grant select, insert, delete on anthem.message_reactions to authenticated;

notify pgrst, 'reload schema';

-- Security fix: public.ecosystem_notifications was a SECURITY DEFINER view that
-- exposed every user''s notification (title/body/link/metadata) to the anon role,
-- bypassing shared.notifications RLS. Flip both notification views to
-- security_invoker so the querying role''s RLS applies.

alter view public.ecosystem_notifications set (security_invoker = on);
alter view public.notifications set (security_invoker = on);

-- security_invoker views require the caller to have base-table privileges.
-- shared.notifications already grants SELECT to anon/authenticated (RLS limits to
-- own rows). so1o.notifications (fallback view source) lacked grants, so add the
-- minimal ones; RLS "Recipients ..." policies still restrict to the owner.
grant select, update on so1o.notifications to authenticated;

-- These are read/update-only feeds from the client. Drop write privileges that
-- were implicitly granted on the views and are never used by the app.
revoke insert, update, delete, truncate, references, trigger
  on public.ecosystem_notifications from anon, authenticated;
revoke insert, delete, truncate, references, trigger
  on public.notifications from anon;
revoke insert, delete, truncate, references, trigger
  on public.notifications from authenticated;

-- Follow-up to security_invoker flip: anon never queries the notifications
-- fallback view, and it now lacks base grants on so1o.notifications. Revoke the
-- leftover anon grants so the view returns a clean permission model.

revoke select, update on public.notifications from anon;

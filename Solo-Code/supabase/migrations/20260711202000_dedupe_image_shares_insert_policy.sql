-- Security hardening: anthem.image_shares had two INSERT policies — an
-- unrestricted "anyone insert share" (with_check true) alongside the ownership
-- check. The permissive one lets any caller forge share rows for arbitrary
-- user_id. Drop it and keep the ownership-scoped policy.

drop policy if exists "anyone insert share" on anthem.image_shares;

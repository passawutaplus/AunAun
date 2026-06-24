-- Replace overly-permissive ALL policy with role-scoped one.
-- service_role bypasses RLS anyway, so this is mainly to silence the linter
-- and document intent clearly. We scope the policy TO service_role.
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

CREATE POLICY "Service role manages subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
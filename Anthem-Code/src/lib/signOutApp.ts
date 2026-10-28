import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearSensitiveActionVerified } from "@/lib/sensitiveActionAuth";
import { disablePush } from "@/lib/pushNotifications";

const OAUTH_REDIRECT_KEY = "ecosystem_oauth_redirect";

/** Full client sign-out: Supabase session + React Query + OAuth redirect stash. */
export async function signOutApp(queryClient?: QueryClient): Promise<void> {
  // Stop this device getting the old account's pushes (shared phones). Needs the session, so before signOut;
  // capped so a slow network never blocks signing out.
  await Promise.race([disablePush().catch(() => undefined), new Promise((r) => setTimeout(r, 2500))]);
  await supabase.auth.signOut();
  queryClient?.clear();
  clearSensitiveActionVerified();
  try {
    sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  } catch {
    /* private mode */
  }
}

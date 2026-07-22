import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearSensitiveActionVerified } from "@/lib/sensitiveActionAuth";

const OAUTH_REDIRECT_KEY = "ecosystem_oauth_redirect";

/** Full client sign-out: Supabase session + React Query + OAuth redirect stash. */
export async function signOutApp(queryClient?: QueryClient): Promise<void> {
  await supabase.auth.signOut();
  queryClient?.clear();
  clearSensitiveActionVerified();
  try {
    sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  } catch {
    /* private mode */
  }
}

import { supabase } from "@/integrations/supabase/client";
import {
  buildOAuthCallbackUrl,
  clearStaleOAuthPkceState,
  currentAppPath,
  safeRelativePath,
  storeOAuthRedirect,
} from "@/lib/oauthRedirect";

const DEFAULT_AFTER_AUTH = "/";

export async function signInWithOAuth(
  options?: { redirectTo?: string },
): Promise<{ error?: Error; redirected?: boolean }> {
  const afterAuth = safeRelativePath(
    options?.redirectTo ?? (typeof window !== "undefined" ? currentAppPath() : undefined),
    DEFAULT_AFTER_AUTH,
  );
  storeOAuthRedirect(afterAuth);

  const callbackUrl = buildOAuthCallbackUrl();
  clearStaleOAuthPkceState();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error };
  if (data?.url && typeof window !== "undefined") {
    // replace() keeps Google out of history — back after login won't replay a stale OAuth flow
    window.location.replace(data.url);
    return { redirected: true };
  }
  return {};
}

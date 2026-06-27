import { supabase } from "@/integrations/supabase/client";
import {
  buildOAuthCallbackUrl,
  clearStaleOAuthPkceState,
  safeRelativePath,
  storeOAuthRedirect,
} from "@/lib/oauthRedirect";

const DEFAULT_AFTER_AUTH = "/dashboard";

export async function signInWithOAuth(options?: {
  redirectTo?: string;
}): Promise<{ error?: Error; redirected?: boolean }> {
  const afterAuth = safeRelativePath(options?.redirectTo, DEFAULT_AFTER_AUTH);
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
    window.location.replace(data.url);
    return { redirected: true };
  }
  return {};
}

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Facebook sign-ins start with a Facebook profile picture whose signed URL stops working after some weeks.
 * Once per visit, a Facebook account whose picture is still such a URL asks the social-avatar-import edge
 * function to copy it into SAMECOR's own storage (or clear it when Facebook no longer serves it).
 */

/** Same host rule as isFacebookImageUrl in Solo-Code/supabase/functions/social-avatar-import. */
export function isExpiringSocialAvatar(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === "fbsbx.com" || host.endsWith(".fbsbx.com") || host === "fbcdn.net" || host.endsWith(".fbcdn.net"))
    );
  } catch {
    return false;
  }
}

export function signedInWithFacebook(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  const meta = user?.app_metadata ?? {};
  const providers: unknown[] = Array.isArray(meta.providers) ? meta.providers : [meta.provider];
  return providers.includes("facebook");
}

async function importIfNeeded(userId: string): Promise<void> {
  const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  if (!isExpiringSocialAvatar(data?.avatar_url)) return;
  await supabase.functions.invoke("social-avatar-import", { body: {} });
}

export function installSocialAvatarImport(): void {
  const checked = new Set<string>();
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    if (!user || (event !== "INITIAL_SESSION" && event !== "SIGNED_IN")) return;
    if (checked.has(user.id) || !signedInWithFacebook(user)) return;
    checked.add(user.id);
    // Supabase must not be called from inside its own auth callback; run it on the next tick.
    window.setTimeout(() => void importIfNeeded(user.id).catch(() => undefined), 0);
  });
}

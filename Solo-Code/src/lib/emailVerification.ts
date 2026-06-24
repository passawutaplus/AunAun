import type { User } from "@supabase/supabase-js";

/** OAuth users are treated as verified; email/password must confirm inbox. */
export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  const provider = user.app_metadata?.provider as string | undefined;
  if (provider && provider !== "email") return true;
  if (user.identities?.some((i) => i.provider !== "email")) return true;
  return !!user.email_confirmed_at;
}

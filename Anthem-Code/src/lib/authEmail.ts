import type { User } from "@supabase/supabase-js";

type AuthEmailUser = Pick<User, "email_confirmed_at" | "identities" | "app_metadata">;

/**
 * Sign-ins that already prove who the person is, so they skip the e-mail link step (never anonymous).
 * LINE may give no e-mail at all, and Facebook / Apple accounts can arrive without email_confirmed_at;
 * without them here those accounts were stuck on "ยืนยันอีเมลของคุณ" right after signing in.
 */
const TRUSTED_OAUTH_PROVIDERS = new Set(["google", "apple", "facebook", "custom:line"]);

/** มี identity จาก OAuth ที่เชื่อถือได้ (เช่น Google) */
export function userHasOAuthIdentity(user: AuthEmailUser | null | undefined): boolean {
  if (!user) return false;
  if (user.identities?.some((i) => TRUSTED_OAUTH_PROVIDERS.has(i.provider))) return true;
  const providers = user.app_metadata?.providers as string[] | undefined;
  return Array.isArray(providers) && providers.some((p) => TRUSTED_OAUTH_PROVIDERS.has(p));
}

/**
 * พอสำหรับเข้า protected routes:
 * - มี email_confirmed_at หรือ
 * - เข้าด้วย OAuth (Google ฯลฯ) ที่ยืนยันอีเมลมาแล้ว
 */
export function isEmailVerifiedForAccess(user: AuthEmailUser | null | undefined): boolean {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  return userHasOAuthIdentity(user);
}

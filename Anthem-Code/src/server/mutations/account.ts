/** Writes to the signed-in person's own account (welcome step, Settings). */
import { supabase } from "@/integrations/supabase/client";
import { flushPendingSignupConsent, markPendingSignupConsent, recordSignupConsents, submitPrivacyRequest } from "@/lib/legalCompliance";
import { buildEmailConfirmUrl, buildResetPasswordUrl } from "@/lib/oauthRedirect";

/**
 * Welcome step after sign-up (mock Login "profile"): display name + CATEGORY (optional), then the home page.
 * Marks onboarding done so the old first-login wizard never shows. Sign-up by Google / LINE / Apple records the
 * Terms / Privacy consent here (the step repeats the mock's consent sentence).
 */
export async function saveWelcome(userId: string, name: string, categories: string[]): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim(), sc_categories: categories, profile_onboarding_at: new Date().toISOString() } as never)
    .eq("user_id", userId);
  if (error) throw error;
  markPendingSignupConsent();
  if (await recordSignupConsents()) return;
  void flushPendingSignupConsent();
}

/** New handle; the database refuses it while the 30-day lock runs (USERNAME_COOLDOWN). */
export async function changeHandle(userId: string, handle: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ username: handle } as never).eq("user_id", userId);
  if (error) throw error;
}

/** New e-mail: Supabase sends a confirmation link to the new address (and, with secure change on, the old one). */
export async function requestEmailChange(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: buildEmailConfirmUrl() });
  if (error) throw error;
}

export async function resendEmailChange(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "email_change", email: newEmail });
  if (error) throw error;
}

/** "เปลี่ยนรหัสผ่าน" / "ตั้งรหัสผ่าน": the same one-time link as forgot-password, sent to the account's e-mail. */
export async function sendPasswordLink(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: buildResetPasswordUrl() });
  if (error) throw error;
}

/** "ออกจากอุปกรณ์อื่น": every other session ends; this one stays. */
export async function signOutOtherDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw error;
}

/** Account deletion request (owner 2026-11-28: the existing flow — hidden by the team, purged after 30 days). */
export async function requestAccountDeletion(): Promise<void> {
  await submitPrivacyRequest("delete", "Settings → ลบบัญชี");
}

export async function cancelAccountDeletion(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("account-deletion-cancel", { body: {} });
  if (error) throw error;
  return (data as { cancelled?: boolean } | null)?.cancelled === true;
}

/** One switch of Settings → Notifications ("chat" / "comment" / "follow" / "event") or "greet_from". */
export async function setMySetting(key: "chat" | "comment" | "follow" | "event" | "greet_from", value: boolean | "everyone" | "following"): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("set_my_setting", { _key: key, _value: String(value) });
  if (error) throw error;
}

/** "creators" / "search" in profiles.public_visibility; the other keys (bio, location …) are kept. */
export async function setVisibilitySwitch(userId: string, key: "creators" | "search", on: boolean): Promise<void> {
  const { data, error: readErr } = await supabase.from("profiles").select("public_visibility" as "*").eq("user_id", userId).maybeSingle();
  if (readErr) throw readErr;
  const pv = (data as { public_visibility?: unknown } | null)?.public_visibility;
  const next = { ...(pv && typeof pv === "object" ? (pv as Record<string, unknown>) : {}), [key]: on };
  const { error } = await supabase.from("profiles").update({ public_visibility: next } as never).eq("user_id", userId);
  if (error) throw error;
}

export async function unblockPerson(userId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from("user_blocks" as never).delete().eq("blocker_id", userId).eq("blocked_id", blockedId);
  if (error) throw error;
}

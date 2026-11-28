/**
 * Sign-in, sign-up and password flows of the new Login page (mock: Login.dc.html). Pure async functions that throw
 * on failure; the page turns errors into the mock's wording. OAuth (Google / LINE / Apple) stays in
 * @/integrations/oauth, shared with the old pages.
 */
import { supabase } from "@/integrations/supabase/client";
import { markPendingSignupConsent, recordSignupConsents } from "@/lib/legalCompliance";
import { establishSession } from "@/lib/authSession";
import { buildEmailConfirmUrl, buildResetPasswordUrl } from "@/lib/oauthRedirect";

export class AuthFlowError extends Error {
  constructor(
    public readonly kind: "bad_login" | "email_taken" | "rate_limited" | "bad_code" | "weak_password" | "same_password" | "other",
    message: string,
  ) {
    super(message);
  }
}

const status = (e: unknown) => (e as { status?: number } | null)?.status;
const code = (e: unknown) => String((e as { code?: string } | null)?.code ?? "");
const text = (e: unknown) => String((e as { message?: string } | null)?.message ?? "").toLowerCase();

function toFlowError(e: unknown): AuthFlowError {
  if (status(e) === 429 || code(e).includes("rate") || text(e).includes("rate limit") || text(e).includes("too many")) {
    return new AuthFlowError("rate_limited", text(e));
  }
  if (code(e) === "weak_password" || text(e).includes("weak")) return new AuthFlowError("weak_password", text(e));
  if (code(e) === "same_password" || text(e).includes("different from the old")) return new AuthFlowError("same_password", text(e));
  return new AuthFlowError("other", text(e));
}

/** E-mail + password. A wrong pair and an unknown e-mail give the same error (no account probing). */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return;
  if (text(error).includes("invalid") || code(error) === "invalid_credentials") throw new AuthFlowError("bad_login", text(error));
  throw toFlowError(error);
}

/**
 * New account by e-mail. Supabase sends a 6-digit code (owner 2026-11-28: verify first, then use the site).
 * Signing up is the consent to Terms / Privacy (mock text under the button), recorded as the old page did.
 */
export async function signUpWithEmail(email: string, password: string): Promise<{ signedIn: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: buildEmailConfirmUrl(), data: { display_name: email.trim().split("@")[0] } },
  });
  if (error) throw toFlowError(error);
  // Supabase hides "already registered" behind an empty identities list.
  if (!data.session && data.user?.identities?.length === 0) throw new AuthFlowError("email_taken", "already registered");
  markPendingSignupConsent();
  void recordSignupConsents();
  return { signedIn: !!data.session };
}

export async function verifySignupCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "signup" });
  if (error) throw status(error) === 429 ? toFlowError(error) : new AuthFlowError("bad_code", text(error));
}

export async function resendSignupCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
  if (error) throw toFlowError(error);
}

/** "ส่งลิงก์ตั้งรหัสผ่านใหม่": the page says the same thing whether or not the account exists. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: buildResetPasswordUrl() });
  if (error && (status(error) === 429 || text(error).includes("rate"))) throw toFlowError(error);
}

/** New password from a recovery link; every other device is signed out (mock: "อุปกรณ์อื่นถูกออกจากระบบแล้ว"). */
export async function setNewPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toFlowError(error);
  await supabase.auth.signOut({ scope: "others" });
}

/**
 * /reset-password: true when the visitor arrived through a valid recovery link (Supabase signs them in and fires
 * PASSWORD_RECOVERY). A plain signed-in visit, a used or an expired link gives false ("Link expired").
 */
export async function openRecoveryLink(): Promise<boolean> {
  let recovered = false;
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recovered = true;
  });
  const search = new URLSearchParams(window.location.search);
  const fromLink =
    search.has("code") || search.has("token_hash") || search.get("type") === "recovery" || window.location.hash.includes("access_token");
  try {
    const failed = await establishSession();
    if (recovered) return true;
    if (failed || !fromLink) return false;
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } finally {
    subscription.unsubscribe();
  }
}

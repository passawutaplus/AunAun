import { supabase } from "@/integrations/supabase/client";
import { formatOAuthCallbackError, parseOAuthError } from "@/lib/oauthRedirect";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

/** Exchange PKCE code / hash tokens from email links into a Supabase session. */
export async function establishSession(): Promise<string | null> {
  const oauthErr = parseOAuthError();
  if (oauthErr) return formatOAuthCallbackError(oauthErr);

  const search = new URLSearchParams(window.location.search);

  // Let detectSessionInUrl finish first (avoids double exchange on ?code= links).
  if (search.get("code")) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return null;
    }
  } else {
    await new Promise((r) => setTimeout(r, 80));
  }

  const { data: { session: existing }, error: existingErr } = await supabase.auth.getSession();
  if (existingErr) return existingErr.message;
  if (existing) return null;

  const tokenHash = search.get("token_hash");
  const type = search.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as OtpType,
    });
    if (error) return formatOAuthCallbackError(error.message);
    return null;
  }

  const code = search.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const retry = await supabase.auth.getSession();
      if (retry.data.session) return null;
      return formatOAuthCallbackError(error.message);
    }
    return null;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return formatOAuthCallbackError(error.message);
    return null;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return sessionError.message;
  if (session) return null;

  const hasAuthParams = code || tokenHash || accessToken;
  if (!hasAuthParams) return null;

  return "ลิงก์หมดอายุหรือไม่ถูกต้อง — ขอลิงก์ใหม่จากหน้าลืมรหัสผ่าน";
}

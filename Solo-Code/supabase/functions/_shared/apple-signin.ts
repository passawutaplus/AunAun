// Sign in with Apple server calls: turn the app's one-time authorization code into a refresh token, and revoke
// that token when the account is deleted (App Store Review Guideline 5.1.1(v)).
//
// Secrets: APPLE_SIGNIN_KEY_ID + APPLE_SIGNIN_PRIVATE_KEY (a .p8 key with "Sign in with Apple" enabled for
// com.samecor.app), APPLE_TEAM_ID (falls back to APNS_TEAM_ID), APPLE_SIGNIN_CLIENT_ID (default com.samecor.app).
// The refresh tokens live in anthem.apple_signin_tokens (migration 20261123110000), readable by the service role only.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { signEs256Jwt } from "./es256-jwt.ts";

const APPLE_ID = "https://appleid.apple.com";

export type AppleSigninConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  clientId: string;
};

export function appleSigninConfigFromEnv(): AppleSigninConfig | null {
  const keyId = Deno.env.get("APPLE_SIGNIN_KEY_ID")?.trim();
  const privateKey = Deno.env.get("APPLE_SIGNIN_PRIVATE_KEY")?.trim();
  const teamId = (Deno.env.get("APPLE_TEAM_ID") || Deno.env.get("APNS_TEAM_ID"))?.trim();
  if (!keyId || !privateKey || !teamId) return null;
  return {
    keyId,
    privateKey,
    teamId,
    clientId: Deno.env.get("APPLE_SIGNIN_CLIENT_ID")?.trim() || "com.samecor.app",
  };
}

/** Apple's client_secret: a JWT signed with the team's key (Apple allows up to 6 months; ours lives 10 minutes). */
function clientSecret(config: AppleSigninConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signEs256Jwt(config.keyId, config.privateKey, {
    iss: config.teamId,
    iat: now,
    exp: now + 600,
    aud: APPLE_ID,
    sub: config.clientId,
  });
}

async function postForm(path: string, form: Record<string, string>): Promise<Response> {
  return await fetch(`${APPLE_ID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(10_000),
  });
}

/** Reads the `sub` claim of an id_token that came straight from Apple over TLS (no signature check needed). */
function idTokenSubject(idToken: unknown): string | null {
  if (typeof idToken !== "string") return null;
  try {
    const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const sub = JSON.parse(atob(payload)).sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

export type AppleCodeExchange = { refreshToken: string; appleSub: string };

/** Exchanges the authorization code the iOS sheet returned (single use, valid 5 minutes). */
export async function exchangeAppleCode(
  config: AppleSigninConfig,
  code: string,
): Promise<AppleCodeExchange> {
  const res = await postForm("/auth/token", {
    client_id: config.clientId,
    client_secret: await clientSecret(config),
    code,
    grant_type: "authorization_code",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`apple_token_${res.status}_${body?.error ?? "unknown"}`);
  const appleSub = idTokenSubject(body.id_token);
  if (typeof body.refresh_token !== "string" || !body.refresh_token || !appleSub) {
    throw new Error("apple_token_incomplete");
  }
  return { refreshToken: body.refresh_token, appleSub };
}

/** Revokes a refresh token: Apple removes SAMECOR from the person's "Sign in with Apple" apps. */
export async function revokeAppleToken(
  config: AppleSigninConfig,
  refreshToken: string,
): Promise<void> {
  const res = await postForm("/auth/revoke", {
    client_id: config.clientId,
    client_secret: await clientSecret(config),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`apple_revoke_${res.status}_${body?.error ?? "unknown"}`);
  }
}

export type AppleRevokeOutcome = "revoked" | "none" | "not_configured" | "failed";

/** Revokes the stored token of a user being deleted. Never throws: a failed revoke must not block the deletion. */
export async function revokeStoredAppleToken(
  admin: SupabaseClient,
  userId: string,
): Promise<AppleRevokeOutcome> {
  try {
    const { data, error } = await admin
      .schema("anthem")
      .from("apple_signin_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.refresh_token) return "none";
    const config = appleSigninConfigFromEnv();
    if (!config) {
      console.warn(
        "[apple-signin] token stored but APPLE_SIGNIN_* secrets are missing; cannot revoke",
        userId,
      );
      return "not_configured";
    }
    await revokeAppleToken(config, data.refresh_token as string);
    await admin.schema("anthem").from("apple_signin_tokens").delete().eq("user_id", userId);
    return "revoked";
  } catch (e) {
    console.error("[apple-signin] revoke", userId, e instanceof Error ? e.message : e);
    return "failed";
  }
}

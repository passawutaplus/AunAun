import { supabaseSecretKey, supabasePublishableKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import {
  type AppleCodeExchange,
  appleSigninConfigFromEnv,
  exchangeAppleCode,
  revokeAppleToken,
} from "../_shared/apple-signin.ts";

/**
 * Called by the site right after Sign in with Apple in the iOS app (src/integrations/oauth.ts). Exchanges the
 * one-time authorization code for Apple's refresh token and keeps it, so account-purge can revoke SAMECOR's
 * access at Apple when the account is deleted (App Store Review Guideline 5.1.1(v)).
 */
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);
  const userClient = createClient(supabaseUrl, supabasePublishableKey(), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(
    authHeader.slice("Bearer ".length),
  );
  const userId = claims?.claims?.sub as string | undefined;
  if (authErr || !userId) return json(req, { error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9._-]{10,1024}$/.test(code)) return json(req, { error: "invalid_code" }, 400);

  const config = appleSigninConfigFromEnv();
  if (!config) return json(req, { error: "not_configured" }, 503);

  const admin = createClient(supabaseUrl, supabaseSecretKey());
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData?.user) return json(req, { error: "unauthorized" }, 401);
  const appleIds = new Set(
    (userData.user.identities ?? [])
      .filter((i) => i.provider === "apple")
      .flatMap((i) =>
        [i.id, i.identity_data?.sub].filter((v): v is string => typeof v === "string" && !!v),
      ),
  );
  if (appleIds.size === 0) return json(req, { error: "not_apple_account" }, 400);

  let exchange: AppleCodeExchange;
  try {
    exchange = await exchangeAppleCode(config, code);
  } catch (e) {
    console.error("[apple-signin-token] exchange", e instanceof Error ? e.message : e);
    return json(req, { error: "exchange_failed" }, 502);
  }

  // The code must belong to this account's own Apple ID; otherwise drop the token at Apple right away.
  if (!appleIds.has(exchange.appleSub)) {
    await revokeAppleToken(config, exchange.refreshToken).catch(() => undefined);
    return json(req, { error: "apple_id_mismatch" }, 403);
  }

  const { error: saveErr } = await admin.schema("anthem").from("apple_signin_tokens").upsert({
    user_id: userId,
    apple_sub: exchange.appleSub,
    refresh_token: exchange.refreshToken,
    updated_at: new Date().toISOString(),
  });
  if (saveErr) {
    console.error("[apple-signin-token] save", saveErr.message);
    return json(req, { error: "save_failed" }, 500);
  }
  return json(req, { saved: true });
});

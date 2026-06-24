import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { exchangeLineAuthCode, verifyLineIdToken } from "../_shared/line-oauth.ts";
import { sendLineTestSamples } from "../_shared/line-test-samples.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

const ConnectSchema = z.union([
  z.object({
    mode: z.literal("oauth_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
  }),
  z.object({
    mode: z.literal("id_token"),
    id_token: z.string().min(1),
  }),
  z.object({
    mode: z.literal("test_samples"),
  }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function authUserId(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return null;
  return claims.claims.sub as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userId = await authUserId(req, supabaseUrl, anonKey);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  if (req.method === "DELETE") {
    const { error } = await admin
      .from("profiles")
      .update({
        line_messaging_user_id: null,
        line_linked_at: null,
        line_notify_enabled: false,
      })
      .eq("user_id", userId);
    if (error) return json({ error: "unlink_failed" }, 500);
    return json({ ok: true, unlinked: true });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: z.infer<typeof ConnectSchema>;
  try {
    body = ConnectSchema.parse(await req.json());
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  if (body.mode === "test_samples") {
    const { data: profile } = await admin
      .from("profiles")
      .select("line_messaging_user_id, subscription_tier, display_name, brand_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.line_messaging_user_id) {
      return json({ error: "line_not_linked" }, 400);
    }

    const tier = profile.subscription_tier ?? "free";
    if (tier !== "pro" && tier !== "pro_plus" && tier !== "inhouse") {
      return json({ error: "pro_required" }, 403);
    }

    const { sent, total, results } = await sendLineTestSamples(profile.line_messaging_user_id, {
      displayName: profile.display_name,
      brandName: profile.brand_name,
    });
    if (sent === 0) {
      const firstErr = results.find((r) => r.error)?.error ?? "line_push_failed";
      return json({ error: firstErr, sent, total, results }, 502);
    }

    return json({ ok: true, sent, total, results });
  }

  try {
    let verified;
    if (body.mode === "oauth_code") {
      const { idToken } = await exchangeLineAuthCode(body.code, body.redirect_uri);
      verified = await verifyLineIdToken(idToken);
    } else {
      verified = await verifyLineIdToken(body.id_token);
    }

    const { data: otherProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("line_messaging_user_id", verified.lineUserId)
      .neq("user_id", userId)
      .maybeSingle();

    if (otherProfile) {
      return json({ error: "line_already_linked" }, 409);
    }

    const { error } = await admin
      .from("profiles")
      .update({
        line_messaging_user_id: verified.lineUserId,
        line_linked_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[line-connect]", error.message);
      return json({ error: "update_failed" }, 500);
    }

    return json({
      ok: true,
      line_user_id: verified.lineUserId,
      display_name: verified.displayName,
      picture_url: verified.pictureUrl,
    });
  } catch (e) {
    console.error("[line-connect]", e);
    return json({ error: e instanceof Error ? e.message : "connect_failed" }, 400);
  }
});

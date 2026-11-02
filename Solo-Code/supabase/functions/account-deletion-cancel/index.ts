import { supabaseSecretKey, supabasePublishableKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors.ts";

/**
 * Lets a signed-in user cancel their own account deletion before it is purged. Runs the cancel as
 * service role because profiles_block_sensitive_update only lets admins or the service role restore
 * account_status; the database function only ever touches the caller's own request.
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
  const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.slice("Bearer ".length));
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, supabaseSecretKey());
  const { data, error } = await admin.rpc("account_cancel_deletion", { _user_id: claims.claims.sub as string });
  if (error) {
    console.error("[account-deletion-cancel]", error.message);
    return json(req, { error: "cancel_failed" }, 500);
  }
  return json(req, { cancelled: data === true });
});

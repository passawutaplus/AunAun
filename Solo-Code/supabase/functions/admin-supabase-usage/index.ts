import { corsHeadersForRequest } from "../_shared/cors.ts";
import { requireAdminUser, adminClient } from "../_shared/admin-auth.ts";
import { fetchSupabaseUsage } from "../_shared/supabase-usage.ts";

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "GET" && req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const auth = await requireAdminUser(req, "admin-supabase-usage");
  if (!auth.ok) return json(req, { error: auth.error }, auth.status);

  const snapshot = await fetchSupabaseUsage(adminClient());
  const { upgrade_advice, ...rest } = snapshot;

  return json(req, {
    ...rest,
    upgrade_advice,
  });
});

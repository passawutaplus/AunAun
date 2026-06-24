import { createClient } from "npm:@supabase/supabase-js@2";
import { debitAiQuota } from "../_shared/ai-quota.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const FEATURE = "design_drill_reroll";
const DAILY_FREE_LIMIT = 3;

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return null;
  return claims.claims.sub as string;
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });

  const userId = await getUserId(req);
  if (!userId) return json(req, { error: "unauthorized" }, 401);

  const admin = adminClient();
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = (body as { action?: string }).action ?? "reroll";

  if (action === "status") {
    const { data, error } = await admin.rpc("get_design_drill_reroll_status", {
      _user_id: userId,
      _daily_limit: DAILY_FREE_LIMIT,
    });
    if (error) return json(req, { error: error.message }, 500);
    return json(req, data);
  }

  const salt = crypto.randomUUID();
  const { data: claim, error: claimErr } = await admin.rpc("claim_design_drill_reroll", {
    _user_id: userId,
    _daily_limit: DAILY_FREE_LIMIT,
  });
  if (claimErr) return json(req, { error: claimErr.message }, 500);

  const claimResult = claim as {
    allowed: boolean;
    reason?: string;
    remaining?: number;
  };

  if (claimResult.allowed) {
    return json(req, {
      salt,
      paid: false,
      creditsUsed: 0,
      remainingFree: claimResult.remaining ?? 0,
    });
  }

  if (claimResult.reason !== "daily_limit_reached") {
    return json(req, { error: claimResult.reason ?? "reroll_failed" }, 400);
  }

  const quota = await debitAiQuota(userId, FEATURE, `drill-reroll:${userId}:${salt}`);
  if (!quota.allowed) {
    return json(req, { error: "limit_reached", reason: quota.reason }, 402);
  }

  return json(req, {
    salt,
    paid: true,
    creditsUsed: quota.cost ?? 1,
    remainingFree: 0,
  });
});

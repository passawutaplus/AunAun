import { corsHeadersForRequest } from "../_shared/cors.ts";
import { requireAdminUser, adminClient } from "../_shared/admin-auth.ts";
import { fetchSupabaseUsage } from "../_shared/supabase-usage.ts";
import { runHealthProbes } from "../_shared/health-probe.ts";
import { fetchVercelUsage } from "../_shared/vercel-usage.ts";
import { fetchAiSummary } from "../_shared/ai-summary.ts";

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

// Ops Hub CORS origins: hq.solofreelancer.com + so1o-ops-*.vercel.app
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "GET" && req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const auth = await requireAdminUser(req, "ops-infra-monitor");
  if (!auth.ok) return json(req, { error: auth.error }, auth.status);

  const now = new Date();
  const admin = adminClient();

  const [health, supabase, vercel, ai] = await Promise.all([
    runHealthProbes(),
    fetchSupabaseUsage(admin),
    fetchVercelUsage(),
    fetchAiSummary(),
  ]);

  const upgradeAdvice = [supabase.upgrade_advice, vercel.upgrade_advice];

  const worstVerdict = (() => {
    const order = ["upgrade_required", "upgrade_recommended", "watch", "ok"] as const;
    for (const v of order) {
      if (upgradeAdvice.some((a) => a.verdict === v)) return v;
    }
    return "ok" as const;
  })();

  return json(req, {
    generated_at: now.toISOString(),
    health,
    supabase,
    vercel,
    ai,
    upgrade_advice: upgradeAdvice,
    overall_verdict: worstVerdict,
  });
});

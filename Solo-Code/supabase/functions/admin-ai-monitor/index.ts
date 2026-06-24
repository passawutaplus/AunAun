import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import {
  EST_THB_PER_CREDIT,
  GEMINI_CONSOLE_LINKS,
  GEMINI_KEY_SURFACES,
  estimateThbFromCredits,
} from "../_shared/ai-cost-estimate.ts";
import {
  defaultFastModel,
  defaultModel,
  defaultVisionModel,
  geminiModelsUpdatedAt,
  getGeminiApiKey,
  latestGeminiModelChangelog,
} from "../_shared/gemini.ts";

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function assertAdmin(userId: string): Promise<boolean> {
  const admin = adminClient();
  const { data, error } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) {
    console.error("[admin-ai-monitor] has_role", error.message);
    return false;
  }
  return !!data;
}

async function probeGemini(): Promise<{ configured: boolean; reachable: boolean; error?: string }> {
  try {
    const key = getGeminiApiKey();
    if (!key.trim()) return { configured: false, reachable: false, error: "empty_key" };
  } catch {
    return { configured: false, reachable: false, error: "not_configured" };
  }
  try {
    const key = getGeminiApiKey();
    const model = defaultFastModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "reply ok" }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { configured: true, reachable: false, error: `${res.status} ${t.slice(0, 120)}` };
    }
    return { configured: true, reachable: true };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : "probe_failed",
    };
  }
}

type LedgerRow = {
  id: string;
  user_id: string;
  feature: string;
  cost: number;
  source: string | null;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "GET" && req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  if (!(await assertAdmin(userId))) return json(req, { error: "forbidden" }, 403);

  const admin = adminClient();
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const today = now.toISOString().slice(0, 10);

  const [ledgerRes, featureCostsRes, creditsRes, periodRes, chatUsageRes, geminiProbe] =
    await Promise.all([
      admin
        .from("ai_credit_ledger")
        .select("id, user_id, feature, cost, source, created_at")
        .gte("created_at", d30.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("ai_feature_costs").select("feature, cost, label").order("feature"),
      admin.from("user_credits").select("user_id, balance, lifetime_purchased, environment"),
      admin
        .from("user_ai_period")
        .select("user_id, included_limit, included_used, period_end, updated_at, period_key"),
      admin
        .from("ai_chat_usage")
        .select("user_id, usage_date, count")
        .gte("usage_date", d30.toISOString().slice(0, 10)),
      probeGemini(),
    ]);

  const ledger = (ledgerRes.data ?? []) as LedgerRow[];
  const featureLabels = new Map(
    (featureCostsRes.data ?? []).map((r: { feature: string; label: string }) => [
      r.feature,
      r.label,
    ]),
  );

  const userIds = [...new Set(ledger.map((r) => r.user_id))];
  const profileMap = new Map<
    string,
    { display_name: string | null; email: string | null; subscription_tier: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name, email, subscription_tier")
      .in("user_id", userIds.slice(0, 200));
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        display_name: p.display_name,
        email: p.email,
        subscription_tier: p.subscription_tier,
      });
    }
  }

  const sumCredits = (rows: LedgerRow[], since?: Date) =>
    rows
      .filter((r) => !since || new Date(r.created_at) >= since)
      .reduce((s, r) => s + (r.cost ?? 0), 0);

  const credits30 = sumCredits(ledger);
  const credits7 = sumCredits(ledger, d7);
  const creditsToday = ledger
    .filter((r) => r.created_at.startsWith(today))
    .reduce((s, r) => s + (r.cost ?? 0), 0);

  const byFeatureMap = new Map<string, { count: number; credits: number }>();
  for (const row of ledger) {
    const cur = byFeatureMap.get(row.feature) ?? { count: 0, credits: 0 };
    cur.count += 1;
    cur.credits += row.cost ?? 0;
    byFeatureMap.set(row.feature, cur);
  }
  const byFeature = [...byFeatureMap.entries()]
    .map(([feature, v]) => ({
      feature,
      label: featureLabels.get(feature) ?? feature,
      count: v.count,
      credits: v.credits,
      estThb: estimateThbFromCredits(v.credits),
    }))
    .sort((a, b) => b.credits - a.credits);

  const userTotals = new Map<string, { count: number; credits: number }>();
  for (const row of ledger) {
    const cur = userTotals.get(row.user_id) ?? { count: 0, credits: 0 };
    cur.count += 1;
    cur.credits += row.cost ?? 0;
    userTotals.set(row.user_id, cur);
  }
  const topUsers = [...userTotals.entries()]
    .map(([uid, v]) => ({
      user_id: uid,
      display_name: profileMap.get(uid)?.display_name ?? null,
      email: profileMap.get(uid)?.email ?? null,
      tier: profileMap.get(uid)?.subscription_tier ?? "free",
      count: v.count,
      credits: v.credits,
      estThb: estimateThbFromCredits(v.credits),
    }))
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 15);

  const recentLedger = ledger.slice(0, 40).map((row) => ({
    ...row,
    label: featureLabels.get(row.feature) ?? row.feature,
    display_name: profileMap.get(row.user_id)?.display_name ?? null,
    email: profileMap.get(row.user_id)?.email ?? null,
  }));

  const purchasedBalance = (creditsRes.data ?? []).reduce(
    (s: number, r: { balance: number }) => s + (r.balance ?? 0),
    0,
  );
  const lifetimePurchased = (creditsRes.data ?? []).reduce(
    (s: number, r: { lifetime_purchased: number }) => s + (r.lifetime_purchased ?? 0),
    0,
  );

  const periodRows = periodRes.data ?? [];
  const includedUsedTotal = periodRows.reduce(
    (s: number, r: { included_used: number }) => s + (r.included_used ?? 0),
    0,
  );

  const chatRows = chatUsageRes.data ?? [];
  const chatToday = chatRows
    .filter((r: { usage_date: string }) => r.usage_date === today)
    .reduce((s: number, r: { count: number }) => s + r.count, 0);
  const chat7 = chatRows
    .filter(
      (r: { usage_date: string }) => Date.now() - new Date(r.usage_date).getTime() < 7 * 86_400_000,
    )
    .reduce((s: number, r: { count: number }) => s + r.count, 0);

  return json(req, {
    generated_at: now.toISOString(),
    gemini: {
      ...geminiProbe,
      modelFast: defaultFastModel(),
      modelDefault: defaultModel(),
      modelVision: defaultVisionModel(),
      modelsUpdatedAt: geminiModelsUpdatedAt(),
      latestModelUpdate: latestGeminiModelChangelog(),
      estThbPerCredit: EST_THB_PER_CREDIT,
      consoleLinks: GEMINI_CONSOLE_LINKS,
      keySurfaces: GEMINI_KEY_SURFACES,
      balanceNote:
        "Google ไม่มี API แสดงเครดิตคงเหลือโดยตรง — ดูยอดที่ AI Studio / Cloud Billing (ลิงก์ด้านล่าง)",
    },
    summary: {
      creditsDebitedToday: creditsToday,
      creditsDebited7d: credits7,
      creditsDebited30d: credits30,
      estCostThbToday: estimateThbFromCredits(creditsToday),
      estCostThb7d: estimateThbFromCredits(credits7),
      estCostThb30d: estimateThbFromCredits(credits30),
      ledgerEvents30d: ledger.length,
      activeUsers30d: userIds.length,
      purchasedBalanceRemaining: purchasedBalance,
      lifetimeCreditsPurchased: lifetimePurchased,
      subscriptionIncludedUsed: includedUsedTotal,
      activePeriodRows: periodRows.length,
    },
    byFeature,
    topUsers,
    recentLedger,
    legacyGuestChat: {
      messagesToday: chatToday,
      messages7d: chat7,
      note: "ai_chat_usage = landing mentor 5 ครั้ง/วัน (แยกจาก ecosystem credits)",
    },
  });
});

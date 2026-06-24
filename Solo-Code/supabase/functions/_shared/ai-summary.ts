import { createClient } from "npm:@supabase/supabase-js@2";
import { estimateThbFromCredits } from "./ai-cost-estimate.ts";
import { defaultFastModel, defaultModel, getGeminiApiKey } from "./gemini.ts";

export type AiSummarySnapshot = {
  gemini: {
    configured: boolean;
    reachable: boolean;
    error?: string;
    modelFast: string;
    modelDefault: string;
  };
  summary: {
    creditsDebited7d: number;
    estCostThb7d: number;
    creditsDebited30d: number;
    estCostThb30d: number;
  };
};

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

export async function fetchAiSummary(): Promise<AiSummarySnapshot> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);

  const [ledgerRes, geminiProbe] = await Promise.all([
    admin.from("ai_credit_ledger").select("cost, created_at").gte("created_at", d30.toISOString()),
    probeGemini(),
  ]);

  const ledger = (ledgerRes.data ?? []) as Array<{ cost: number; created_at: string }>;
  const sumSince = (since: Date) =>
    ledger.filter((r) => new Date(r.created_at) >= since).reduce((s, r) => s + (r.cost ?? 0), 0);

  const credits7 = sumSince(d7);
  const credits30 = sumSince(d30);

  return {
    gemini: {
      ...geminiProbe,
      modelFast: defaultFastModel(),
      modelDefault: defaultModel(),
    },
    summary: {
      creditsDebited7d: credits7,
      estCostThb7d: estimateThbFromCredits(credits7),
      creditsDebited30d: credits30,
      estCostThb30d: estimateThbFromCredits(credits30),
    },
  };
}

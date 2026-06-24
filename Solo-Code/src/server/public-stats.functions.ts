import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type StatsResult = { approved: number; target: number; error: string | null };

const TTL_MS = 60_000;
let cached: StatsResult | null = null;
let cachedAt = 0;

export const getEarlyAccessStats = createServerFn({ method: "GET" }).handler(async () => {
  const TARGET = 100;
  if (cached && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }
  try {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tester_approved", true);
    if (error) {
      console.error("[getEarlyAccessStats] query failed:", error.message);
      if (cached) return cached;
      return { approved: 0, target: TARGET, error: "Stats unavailable" };
    }
    const approved = Math.min(TARGET, count ?? 0);
    const result: StatsResult = { approved, target: TARGET, error: null };
    cached = result;
    cachedAt = Date.now();
    return result;
  } catch (e) {
    console.error("[getEarlyAccessStats] unexpected:", e instanceof Error ? e.message : String(e));
    if (cached) return cached;
    return { approved: 0, target: TARGET, error: "Stats unavailable" };
  }
});

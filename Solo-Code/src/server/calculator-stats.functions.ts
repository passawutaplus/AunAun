import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getCalculatorUsageCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_calculator_usage_count");
    if (error) {
      console.error("[getCalculatorUsageCount] failed:", error.message);
      return { count: 0, error: "unavailable" as const };
    }
    const n = typeof data === "number" ? data : Number(data ?? 0);
    return { count: Number.isFinite(n) ? n : 0, error: null };
  } catch (e) {
    console.error(
      "[getCalculatorUsageCount] unexpected:",
      e instanceof Error ? e.message : String(e),
    );
    return { count: 0, error: "unavailable" as const };
  }
});

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiUsageSummary, getServerPaymentsEnv } from "@/lib/aiCreditsServer";

export const fetchAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getAiUsageSummary(context.userId, getServerPaymentsEnv());
  });

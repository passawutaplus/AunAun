import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserStorageSummary } from "@/lib/storageQuotaServer";

export const fetchStorageUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getUserStorageSummary(context.userId);
  });

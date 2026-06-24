import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { StorageUsageSummary } from "@/lib/storageQuota";

export async function getUserStorageSummary(userId: string): Promise<StorageUsageSummary> {
  const { data, error } = await (supabaseAdmin as any).rpc("get_user_storage_summary", {
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data as StorageUsageSummary;
}

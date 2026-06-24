import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StorageCategoryId } from "@/lib/storageQuotas";
import type {
  PurgeStorageCategoryResult,
  UserStorageUsageResponse,
} from "@/lib/storageUsage.types";

export const getUserStorageUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserStorageUsageResponse> => {
    const { getUserStorageUsage: load } = await import("@/lib/storageUsage.server");
    return load(context.userId);
  });

const purgeSchema = z.object({
  category: z.enum(["photos", "documents", "videos", "data", "others"]),
});

export const purgeUserStorageCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => purgeSchema.parse(data))
  .handler(async ({ context, data }): Promise<PurgeStorageCategoryResult> => {
    const { purgeUserStorageCategory: purge } = await import("@/lib/storageUsage.server");
    return purge(context.userId, data.category as StorageCategoryId);
  });

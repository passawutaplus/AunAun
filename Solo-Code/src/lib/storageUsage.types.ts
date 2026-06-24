import type { StorageCategoryId } from "@/lib/storageQuotas";
import type { Tier } from "@/hooks/useSubscription";

export interface StorageCategoryUsage {
  id: StorageCategoryId;
  bytes: number;
  fileCount: number;
}

export interface UserStorageUsageResponse {
  tier: Tier;
  limitBytes: number;
  usedBytes: number;
  categories: StorageCategoryUsage[];
  /** ISO timestamp of last calculation */
  calculatedAt: string;
}

export interface PurgeStorageCategoryResult {
  category: StorageCategoryId;
  deletedFiles: number;
  freedBytes: number;
}

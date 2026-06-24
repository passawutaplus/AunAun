import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { fetchStorageUsage } from "@/lib/storageQuota.functions";
import type { StorageUsageSummary } from "@/lib/storageQuota";
import { STORAGE_LIMIT_BYTES } from "@/lib/storageQuota";

const EMPTY: StorageUsageSummary = {
  tier: "free",
  total_bytes: 0,
  limit_bytes: STORAGE_LIMIT_BYTES.free,
  db_bytes: 0,
  file_bytes: 0,
  remaining_bytes: STORAGE_LIMIT_BYTES.free,
  categories: [],
};

export function useStorageUsage() {
  const { user } = useAuth();
  const fetchFn = useServerFn(fetchStorageUsage);

  const query = useQuery({
    queryKey: ["storage-usage", user?.id],
    enabled: !!user,
    queryFn: () => fetchFn(),
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data ?? EMPTY;

  return {
    ...data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    limitReached: data.total_bytes >= data.limit_bytes,
  };
}

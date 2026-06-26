import { BRAND_NAME } from "@/lib/brandConfig";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  ANTHEM_STORAGE_LABEL,
  ANTHEM_STORAGE_PREFIX,
  ANTHEM_STORAGE_QUOTA_BYTES,
  formatStorageBytes,
} from "@/lib/storageQuotas";

interface ListedFile {
  path: string;
  size: number;
}

type StorageListEntry = {
  name: string;
  id: string | null;
  metadata: Record<string, unknown> | null;
};

const STORAGE_CACHE_MS = 5 * 60_000;
const storageUsedCache = new Map<string, { bytes: number; at: number }>();
const inFlightScan = new Map<string, Promise<number>>();

function entrySize(meta: Record<string, unknown> | null): number {
  if (!meta) return 0;
  if (typeof meta.size === "number") return meta.size;
  if (typeof meta.contentLength === "number") return meta.contentLength;
  return 0;
}

function isStorageFolder(entry: StorageListEntry): boolean {
  return entry.id == null && entry.metadata == null;
}

/** Warm quota cache while user crops (upload feels instant after confirm). */
export function prefetchAnthemStorageUsage(userId: string): void {
  void getAnthemStorageUsedBytes(userId);
}

export function bumpAnthemStorageCache(userId: string, deltaBytes: number): void {
  const hit = storageUsedCache.get(userId);
  if (hit) {
    storageUsedCache.set(userId, { bytes: hit.bytes + deltaBytes, at: Date.now() });
  }
}

export function invalidateAnthemStorageCache(userId: string): void {
  storageUsedCache.delete(userId);
  inFlightScan.delete(userId);
}

async function listFolder(folder: string): Promise<StorageListEntry[]> {
  const { data, error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  return (data ?? []) as StorageListEntry[];
}

async function listFilesUnderPrefix(prefix: string): Promise<ListedFile[]> {
  const out: ListedFile[] = [];
  const queue: string[] = [prefix];

  while (queue.length > 0) {
    const folder = queue.shift()!;
    const entries = await listFolder(folder);
    for (const entry of entries) {
      const rel = folder ? `${folder}/${entry.name}` : entry.name;
      if (isStorageFolder(entry)) {
        queue.push(rel);
        continue;
      }
      out.push({ path: rel, size: entrySize(entry.metadata) });
    }
  }

  return out;
}

async function scanAnthemStorageUsedBytes(userId: string): Promise<number> {
  const prefix = `${ANTHEM_STORAGE_PREFIX}/${userId}`;
  try {
    const files = await listFilesUnderPrefix(prefix);
    const bytes = files.reduce((sum, f) => sum + f.size, 0);
    storageUsedCache.set(userId, { bytes, at: Date.now() });
    return bytes;
  } catch {
    const cached = storageUsedCache.get(userId);
    return cached?.bytes ?? 0;
  }
}

/** Sum bytes under `anthem/{userId}/` in shared project-media bucket. */
export async function getAnthemStorageUsedBytes(userId: string): Promise<number> {
  const cached = storageUsedCache.get(userId);
  if (cached && Date.now() - cached.at < STORAGE_CACHE_MS) {
    return cached.bytes;
  }

  const pending = inFlightScan.get(userId);
  if (pending) return pending;

  const scan = scanAnthemStorageUsedBytes(userId).finally(() => {
    inFlightScan.delete(userId);
  });
  inFlightScan.set(userId, scan);
  return scan;
}

export function anthemStorageLimitBytes(tier: Tier): number {
  return ANTHEM_STORAGE_QUOTA_BYTES[tier];
}

type AssertStorageOptions = {
  /** When true, never block upload on a full bucket scan — use cache or skip. */
  nonBlocking?: boolean;
};

function throwIfOverQuota(used: number, tier: Tier, additionalBytes: number): void {
  const limit = anthemStorageLimitBytes(tier);
  if (used + additionalBytes > limit) {
    throw new Error(
      `พื้นที่ ${BRAND_NAME} เต็มแล้ว (${formatStorageBytes(used)} / ${ANTHEM_STORAGE_LABEL[tier]}) — ลบไฟล์เก่าหรืออัปเกรด Pro ที่ So1o`,
    );
  }
}

/** Block upload/publish when Aplus1 pool would exceed tier cap. */
export async function assertAnthemStorageAvailable(
  userId: string,
  tier: Tier,
  additionalBytes: number,
  options?: AssertStorageOptions,
): Promise<void> {
  const cached = storageUsedCache.get(userId);
  if (cached && Date.now() - cached.at < STORAGE_CACHE_MS) {
    throwIfOverQuota(cached.bytes, tier, additionalBytes);
    return;
  }

  if (options?.nonBlocking) {
    void getAnthemStorageUsedBytes(userId);
    return;
  }

  const used = await getAnthemStorageUsedBytes(userId);
  throwIfOverQuota(used, tier, additionalBytes);
}

export function storageUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

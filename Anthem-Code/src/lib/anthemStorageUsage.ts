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

async function listFolder(
  folder: string,
): Promise<{ name: string; metadata: Record<string, unknown> | null }[]> {
  const { data, error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  return (data ?? []) as { name: string; metadata: Record<string, unknown> | null }[];
}

async function listFilesUnderPrefix(prefix: string): Promise<ListedFile[]> {
  const out: ListedFile[] = [];

  async function walk(folder: string) {
    const entries = await listFolder(folder);
    for (const entry of entries) {
      const rel = folder ? `${folder}/${entry.name}` : entry.name;
      const meta = entry.metadata;
      const size =
        typeof meta?.size === "number"
          ? meta.size
          : typeof meta?.contentLength === "number"
            ? meta.contentLength
            : 0;
      const mimetype =
        typeof meta?.mimetype === "string"
          ? meta.mimetype
          : typeof meta?.contentType === "string"
            ? meta.contentType
            : null;

      if (size > 0 || mimetype) {
        out.push({ path: rel, size });
      } else {
        await walk(rel);
      }
    }
  }

  await walk(prefix);
  return out;
}

/** Sum bytes under `anthem/{userId}/` in shared project-media bucket. */
export async function getAnthemStorageUsedBytes(userId: string): Promise<number> {
  const prefix = `${ANTHEM_STORAGE_PREFIX}/${userId}`;
  try {
    const files = await listFilesUnderPrefix(prefix);
    return files.reduce((sum, f) => sum + f.size, 0);
  } catch {
    return 0;
  }
}

export function anthemStorageLimitBytes(tier: Tier): number {
  return ANTHEM_STORAGE_QUOTA_BYTES[tier];
}

/** Block upload/publish when Aplus1 pool would exceed tier cap. */
export async function assertAnthemStorageAvailable(
  userId: string,
  tier: Tier,
  additionalBytes: number,
): Promise<void> {
  const used = await getAnthemStorageUsedBytes(userId);
  const limit = anthemStorageLimitBytes(tier);
  if (used + additionalBytes > limit) {
    throw new Error(
      `พื้นที่ ${BRAND_NAME} เต็มแล้ว (${formatStorageBytes(used)} / ${ANTHEM_STORAGE_LABEL[tier]}) — ลบไฟล์เก่าหรืออัปเกรด Pro ที่ So1o`,
    );
  }
}

export function storageUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

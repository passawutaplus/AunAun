import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tier } from "@/hooks/useSubscription";
import {
  STORAGE_QUOTA_BYTES,
  USER_STORAGE_BUCKETS,
  type StorageCategoryId,
} from "@/lib/storageQuotas";
import type {
  PurgeStorageCategoryResult,
  StorageCategoryUsage,
  UserStorageUsageResponse,
} from "@/lib/storageUsage.types";

const untypedSupabaseAdmin = supabaseAdmin as any;

interface ListedFile {
  bucket: string;
  path: string;
  size: number;
  mimetype: string | null;
}

const DOC_BUCKETS = new Set([
  "expense-receipts",
  "wht-certificates",
  "supplier-files",
  "ticket-attachments",
]);

const PHOTO_BUCKETS = new Set([
  "brand-logos",
  "brief-references",
  "chat-images",
  "supplier-covers",
]);

function emptyCategories(): Record<StorageCategoryId, StorageCategoryUsage> {
  return {
    photos: { id: "photos", bytes: 0, fileCount: 0 },
    documents: { id: "documents", bytes: 0, fileCount: 0 },
    videos: { id: "videos", bytes: 0, fileCount: 0 },
    data: { id: "data", bytes: 0, fileCount: 0 },
    others: { id: "others", bytes: 0, fileCount: 0 },
  };
}

function categorizeFile(file: ListedFile): StorageCategoryId {
  const mime = (file.mimetype ?? "").toLowerCase();
  if (mime.startsWith("video/")) return "videos";
  if (DOC_BUCKETS.has(file.bucket)) return "documents";
  if (mime.includes("pdf") || mime.startsWith("application/")) return "documents";
  if (PHOTO_BUCKETS.has(file.bucket) || mime.startsWith("image/")) return "photos";
  return "others";
}

async function listFolder(
  bucket: string,
  folder: string,
): Promise<{ name: string; metadata: Record<string, unknown> | null }[]> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  return (data ?? []) as { name: string; metadata: Record<string, unknown> | null }[];
}

/** Recursively list files under a prefix (Supabase list API). */
async function listFilesUnderPrefix(bucket: string, prefix: string): Promise<ListedFile[]> {
  const out: ListedFile[] = [];

  async function walk(folder: string) {
    const entries = await listFolder(bucket, folder);
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
        out.push({ bucket, path: rel, size, mimetype });
      } else {
        await walk(rel);
      }
    }
  }

  await walk(prefix);
  return out;
}

async function listUserStorageFiles(userId: string): Promise<ListedFile[]> {
  const files: ListedFile[] = [];

  for (const bucket of USER_STORAGE_BUCKETS) {
    try {
      const listed = await listFilesUnderPrefix(bucket, userId);
      files.push(...listed);
    } catch {
      // bucket may not exist in some environments
    }
  }

  const { data: jobs } = await supabaseAdmin
    .from("job_trackers")
    .select("id")
    .eq("user_id", userId);

  for (const job of jobs ?? []) {
    try {
      const slips = await listFilesUnderPrefix("job-tracker", `slips/${job.id}`);
      files.push(...slips);
    } catch {
      /* noop */
    }
  }

  return files;
}

async function countUserRows(
  table:
    | "quotations"
    | "design_briefs"
    | "ai_chat_messages"
    | "saved_clients"
    | "finance_incomes"
    | "finance_expenses"
    | "planner_posts"
    | "notifications",
  userId: string,
): Promise<number> {
  const { count, error } = await untypedSupabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
}

/** Rough DB payload estimate from row counts (not exact pg_column_size). */
async function estimateUserDataBytes(userId: string): Promise<number> {
  const [quotations, briefs, aiChat, clients, incomes, expenses, planner, notifs] =
    await Promise.all([
      countUserRows("quotations", userId),
      countUserRows("design_briefs", userId),
      countUserRows("ai_chat_messages", userId),
      countUserRows("saved_clients", userId),
      countUserRows("finance_incomes", userId),
      countUserRows("finance_expenses", userId),
      countUserRows("planner_posts", userId),
      countUserRows("notifications", userId),
    ]);

  return (
    quotations * 12_000 +
    briefs * 18_000 +
    aiChat * 2_500 +
    clients * 1_500 +
    incomes * 800 +
    expenses * 1_200 +
    planner * 3_000 +
    notifs * 600
  );
}

async function resolveTier(userId: string): Promise<Tier> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  const t = profile?.subscription_tier;
  if (t === "pro" || t === "pro_plus" || t === "inhouse") return t;
  return "free";
}

export async function getUserStorageUsage(userId: string): Promise<UserStorageUsageResponse> {
  const tier = await resolveTier(userId);
  const limitBytes = STORAGE_QUOTA_BYTES[tier];
  const categories = emptyCategories();

  const files = await listUserStorageFiles(userId);
  for (const file of files) {
    const cat = categorizeFile(file);
    categories[cat].bytes += file.size;
    categories[cat].fileCount += 1;
  }

  const dataBytes = await estimateUserDataBytes(userId);
  categories.data.bytes = dataBytes;
  categories.data.fileCount = 0;

  const usedBytes = Object.values(categories).reduce((s, c) => s + c.bytes, 0);

  return {
    tier,
    limitBytes,
    usedBytes,
    categories: Object.values(categories),
    calculatedAt: new Date().toISOString(),
  };
}

async function deleteListedFiles(files: ListedFile[]): Promise<{ count: number; bytes: number }> {
  let count = 0;
  let bytes = 0;
  const byBucket = new Map<string, string[]>();

  for (const f of files) {
    const list = byBucket.get(f.bucket) ?? [];
    list.push(f.path);
    byBucket.set(f.bucket, list);
    bytes += f.size;
    count += 1;
  }

  for (const [bucket, paths] of byBucket) {
    const chunkSize = 50;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
      if (error) throw error;
    }
  }

  return { count, bytes };
}

export async function purgeUserStorageCategory(
  userId: string,
  category: StorageCategoryId,
): Promise<PurgeStorageCategoryResult> {
  if (category === "data") {
    const tables = ["ai_chat_messages", "notifications"] as const;

    let freed = 0;
    for (const table of tables) {
      const { count } = await untypedSupabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const est = (count ?? 0) * (table === "ai_chat_messages" ? 2_500 : 600);
      const { error } = await untypedSupabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw error;
      freed += est;
    }

    return { category, deletedFiles: 0, freedBytes: freed };
  }

  const files = await listUserStorageFiles(userId);
  const toDelete = files.filter((f) => categorizeFile(f) === category);
  const { count, bytes } = await deleteListedFiles(toDelete);

  if (category === "photos") {
    await supabaseAdmin
      .from("profiles")
      .update({ logo_url: null, payment_qr_url: null, signature_url: null })
      .eq("user_id", userId);
  }

  return { category, deletedFiles: count, freedBytes: bytes };
}

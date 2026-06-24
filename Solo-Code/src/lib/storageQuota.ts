/** Client-safe storage quota constants — keep in sync with `storage_tier_config`. */

export const STORAGE_LIMIT_BYTES: Record<"free" | "pro" | "inhouse", number> = {
  free: 100 * 1024 * 1024,
  pro: 5 * 1024 * 1024 * 1024,
  inhouse: 10 * 1024 * 1024 * 1024,
};

export type StorageCategoryKey =
  | "documents"
  | "suppliers"
  | "jobs"
  | "finance"
  | "brand_assets"
  | "planner"
  | "portfolio"
  | "other";

export const STORAGE_CATEGORY_LABELS: Record<StorageCategoryKey, string> = {
  documents: "เอกสาร & ใบเสนอราคา",
  suppliers: "Supplier & ไฟล์",
  jobs: "Job Tracker & งาน",
  finance: "การเงิน & ใบเสร็จ",
  brand_assets: "แบรนด์ & Assets",
  planner: "Planner & โปรเจกต์",
  portfolio: "Portfolio & CV",
  other: "อื่นๆ",
};

export type StorageUsageSummary = {
  tier: string;
  total_bytes: number;
  limit_bytes: number;
  db_bytes: number;
  file_bytes: number;
  remaining_bytes: number;
  categories: { key: StorageCategoryKey; bytes: number }[];
};

export function formatStorageBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function storageUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function describeStoragePlan(tier: string, limitBytes: number): string {
  if (tier === "pro") return `Pro ${formatStorageBytes(limitBytes)}`;
  if (tier === "inhouse") return `In-House ${formatStorageBytes(limitBytes)}`;
  return `Free ${formatStorageBytes(limitBytes)}`;
}

export function storageWarningLevel(
  percent: number,
): "ok" | "warn" | "critical" | "full" {
  if (percent >= 100) return "full";
  if (percent >= 90) return "critical";
  if (percent >= 70) return "warn";
  return "ok";
}

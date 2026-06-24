import type { Tier } from "@/hooks/useSubscription";

/** Logical storage categories shown in Settings → Your Storage */
export type StorageCategoryId = "photos" | "documents" | "videos" | "data" | "others";

export interface StorageCategoryMeta {
  id: StorageCategoryId;
  label: string;
  labelEn: string;
  /** Tailwind bar / dot color */
  colorClass: string;
  description: string;
}

export const STORAGE_CATEGORIES: StorageCategoryMeta[] = [
  {
    id: "photos",
    label: "รูปภาพ",
    labelEn: "Photos",
    colorClass: "bg-amber-400",
    description: "โลโก้, QR, Assets, Brief, Job Tracker, แชท",
  },
  {
    id: "documents",
    label: "เอกสาร & ไฟล์",
    labelEn: "Documents",
    colorClass: "bg-blue-500",
    description: "สลิปภาษี, ใบเสร็จ, Supplier, Ticket แนบ",
  },
  {
    id: "videos",
    label: "วิดีโอ",
    labelEn: "Videos",
    colorClass: "bg-emerald-500",
    description: "ไฟล์วิดีโอที่อัปโหลด",
  },
  {
    id: "data",
    label: "ข้อมูลในระบบ",
    labelEn: "App Data",
    colorClass: "bg-fuchsia-500",
    description: "ใบเสนอราคา, Brief, แชท AI, ลูกค้า (ประมาณการ)",
  },
  {
    id: "others",
    label: "อื่นๆ",
    labelEn: "Others",
    colorClass: "bg-rose-500",
    description: "ไฟล์ที่ไม่เข้าหมวดหลัก",
  },
];

/**
 * Per-user storage caps (files + DB estimate combined).
 *
 * Business rationale (Supabase Pro $25/mo ≈ 875฿, 100 GB file + 8 GB DB):
 * - Pro user pays 249฿/mo → 2 GB cap keeps avg ~200–400 MB while margin stays >95% on storage.
 * - Free 150 MB protects shared Free-tier pool (1 GB platform) until upgrade.
 * - In-House 10 GB for team asset library (599฿/seat).
 *
 * At 400 Pro users × 300 MB avg ≈ 120 GB → plan Supabase overage or tiered caps before scale.
 */
/** So1o My Desk storage pool (separate from Anthem `project-media`). */
export const SO1O_STORAGE_QUOTA_BYTES: Record<Tier, number> = {
  free: 50 * 1024 * 1024,
  pro: 2 * 1024 * 1024 * 1024,
  pro_plus: 4 * 1024 * 1024 * 1024,
  inhouse: 10 * 1024 * 1024 * 1024,
};

/** @deprecated Use SO1O_STORAGE_QUOTA_BYTES */
export const STORAGE_QUOTA_BYTES = SO1O_STORAGE_QUOTA_BYTES;

export const SO1O_STORAGE_QUOTA_LABEL: Record<Tier, string> = {
  free: "50 MB",
  pro: "2 GB",
  pro_plus: "4 GB",
  inhouse: "10 GB",
};

/** @deprecated Use SO1O_STORAGE_QUOTA_LABEL */
export const STORAGE_QUOTA_LABEL = SO1O_STORAGE_QUOTA_LABEL;

/** Buckets scanned for a user's files (path `{userId}/…` unless noted). */
export const USER_STORAGE_BUCKETS = [
  "brand-logos",
  "brief-references",
  "job-tracker",
  "chat-images",
  "supplier-files",
  "supplier-covers",
  "expense-receipts",
  "wht-certificates",
  "ticket-attachments",
] as const;

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function storageUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

import type { Tier } from "@/core/subscription/useSubscription";

/** Anthem portfolio / chat / studio media pool (`project-media/anthem/`). */
export const ANTHEM_STORAGE_QUOTA_BYTES: Record<Tier, number> = {
  free: 300 * 1024 * 1024,
  pro: Math.round(1.5 * 1024 * 1024 * 1024),
  pro_plus: Math.round(2.5 * 1024 * 1024 * 1024),
  inhouse: 8 * 1024 * 1024 * 1024,
};

export const ANTHEM_STORAGE_LABEL: Record<Tier, string> = {
  free: "300 MB",
  pro: "1.5 GB",
  pro_plus: "2.5 GB",
  inhouse: "8 GB",
};

export const ANTHEM_MEDIA_BUCKET = "project-media";
export const ANTHEM_STORAGE_PREFIX = "anthem";

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

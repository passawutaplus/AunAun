import type { TrackingFeature, TrackingSite } from "@/lib/ecosystem-tracking";
import { statusLabel } from "@/lib/ecosystem-tracking";

export type TrackingSiteId = TrackingSite["id"];

export type OpsIssuePriority = "critical" | "high" | "medium" | "low";

export type TrackingIssueDraft = {
  title: string;
  description: string;
  label: string;
  priority: OpsIssuePriority;
  featureName: string;
  categoryTitle: string;
};

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

export function trackingLabel(
  siteId: string,
  categoryId: string,
  featureName: string,
  improve: string,
) {
  return `tracking:${siteId}:${categoryId}:${slugPart(featureName)}:${slugPart(improve)}`;
}

export function siteToProjectSlug(siteId: TrackingSiteId): "so1o" | "an1hem" | "ecosystem" {
  if (siteId === "so1o") return "so1o";
  if (siteId === "an1hem") return "an1hem";
  return "ecosystem";
}

export function priorityForFeature(feature: TrackingFeature): OpsIssuePriority {
  if (feature.status === "planned") return "medium";
  if (feature.percent < 70) return "high";
  if (feature.percent < 85) return "medium";
  return "low";
}

export function collectTrackingIssueDrafts(
  site: TrackingSite,
  filter?: { categoryId: string; featureName: string },
): TrackingIssueDraft[] {
  const drafts: TrackingIssueDraft[] = [];

  for (const cat of site.categories) {
    if (filter && cat.id !== filter.categoryId) continue;
    for (const feature of cat.features) {
      if (filter && feature.name !== filter.featureName) continue;
      if (feature.improve.length === 0) continue;
      for (const improve of feature.improve) {
        drafts.push({
          title: improve,
          description: [
            `【${site.name}】${cat.title} › ${feature.name}`,
            "",
            feature.description,
            "",
            `ความพร้อม: ${feature.percent}% (${statusLabel(feature.status)})`,
          ].join("\n"),
          label: trackingLabel(site.id, cat.id, feature.name, improve),
          priority: priorityForFeature(feature),
          featureName: feature.name,
          categoryTitle: cat.title,
        });
      }
    }
  }

  return drafts;
}

export const OPS_ISSUE_STATUS_LABELS: Record<string, string> = {
  backlog: "คลัง",
  todo: "รอทำ",
  in_progress: "กำลังทำ",
  in_review: "รอตรวจ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

export const OPS_ISSUE_STATUS_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const;

import type { WorkItem } from "@/lib/work-items";
import type { EcosystemFunnelData } from "@/hooks/useEcosystemFunnel";
import { getFunnelAlerts } from "@/lib/funnel-alerts";

export function buildEcosystemAnomalies(funnel: EcosystemFunnelData | undefined): WorkItem[] {
  if (!funnel) return [];

  const now = new Date().toISOString();

  return getFunnelAlerts(funnel).map((alert) => ({
    id: alert.id === "stuck_links" ? "ecosystem_alert:stuck_links" : `ecosystem_alert:${alert.id}`,
    source: "ecosystem_alert" as const,
    sourceId: alert.id.replace("flow:", ""),
    app: "ecosystem" as const,
    key:
      alert.id === "stuck_links"
        ? "ECO-STUCK"
        : `ECO-${alert.id.replace("flow:", "").slice(0, 8).toUpperCase()}`,
    title: alert.title,
    description: `${alert.description} — ดูที่หน้า Connections`,
    rawStatus: "open",
    boardColumn: "triage" as const,
    priority: alert.severity === "high" ? ("high" as const) : ("medium" as const),
    adminNote: null,
    createdAt: now,
    updatedAt: now,
    deepLink: "/connections",
    category: "flywheel",
  }));
}

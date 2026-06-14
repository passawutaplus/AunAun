import type { EcosystemFunnelData } from "@/hooks/useEcosystemFunnel";

export type FunnelAlert = {
  id: string;
  severity: "high" | "medium";
  title: string;
  description: string;
};

export function getFunnelAlerts(funnel: EcosystemFunnelData | undefined): FunnelAlert[] {
  if (!funnel) return [];

  const alerts: FunnelAlert[] = [];
  const stuck = funnel.totals.stuck_48h;

  if (stuck > 0) {
    alerts.push({
      id: "stuck_links",
      severity: stuck >= 5 ? "high" : "medium",
      title: `Cross-link ค้าง ${stuck} รายการ (>48h ไม่ convert)`,
      description: "ผู้ใช้กด CTA ข้ามแอปแล้วแต่ยังไม่ handoff สำเร็จ",
    });
  }

  for (const flow of funnel.flows) {
    if (flow.clicks < 3) continue;
    const rate = flow.clicks > 0 ? (flow.converted / flow.clicks) * 100 : 100;
    if (rate >= 15 && flow.stuck < 3) continue;

    alerts.push({
      id: `flow:${flow.id}`,
      severity: rate < 10 ? "high" : "medium",
      title: `Conversion ต่ำ: ${flow.label} (${Math.round(rate)}%)`,
      description: `${flow.clicks} clicks · ${flow.converted} converted · ${flow.stuck} stuck`,
    });
  }

  return alerts;
}

export function computeFlywheelHealthScore(funnel: EcosystemFunnelData | undefined): number | null {
  if (!funnel) return null;

  const { clicks_7d, converted_7d, stuck_48h } = funnel.totals;
  if (clicks_7d === 0 && stuck_48h === 0) return 100;

  const conversionRate = clicks_7d > 0 ? (converted_7d / clicks_7d) * 100 : 0;
  let score = Math.min(100, conversionRate * 2);

  if (stuck_48h >= 5) score -= 25;
  else if (stuck_48h >= 1) score -= stuck_48h * 4;

  return Math.max(0, Math.round(score));
}

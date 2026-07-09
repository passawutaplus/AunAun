import type { InfraMonitorResponse } from "@/lib/infra-monitor-types";
import type { TrackingSite } from "@/lib/ecosystem-tracking";
import { ECOSYSTEM_SITES } from "@/lib/ecosystem-tracking";
import type { EcosystemFunnelData } from "@/hooks/useEcosystemFunnel";
import { conversionRate } from "@/lib/connection-flows";
import { MONITOR_SITES, mergeHealthIntoChecklist } from "@/lib/monitoring-checklist";

export type TrackingSyncOverlay = {
  siteId: TrackingSite["id"];
  boosts: { featureName: string; categoryId: string; delta: number; reason: string }[];
  syncedAt: string;
};

function healthOk(probes: InfraMonitorResponse["health"], urlPart: string) {
  const needle = urlPart.toLowerCase();
  const probe = probes.find(
    (p) => p.url.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle),
  );
  return probe?.ok === true;
}

function checklistLiveRatio(siteId: "so1o" | "an1hem" | "ops_hub", health: InfraMonitorResponse["health"]) {
  const merged = mergeHealthIntoChecklist(
    MONITOR_SITES.filter((s) => s.id === siteId),
    health.map((h) => ({ name: h.name, ok: h.ok })),
  );
  const items = merged[0]?.items ?? [];
  const automated = items.filter((i) => i.automated);
  if (automated.length === 0) return 0;
  const live = automated.filter((i) => i.status === "live").length;
  return Math.round((live / automated.length) * 100);
}

/** Runtime overlay: bump monitoring-related feature % from live infra + checklist + funnel. */
export function computeTrackingSyncOverlay(
  data: InfraMonitorResponse | undefined,
  funnel?: EcosystemFunnelData,
): TrackingSyncOverlay[] {
  if (!data) return [];

  const syncedAt = data.generated_at;
  const so1oOk = healthOk(data.health, "solofreelancer");
  const an1hemOk =
    healthOk(data.health, "an1hem") ||
    healthOk(data.health, "aplus1") ||
    healthOk(data.health, "aplus1-demo") ||
    healthOk(data.health, "pixel100");
  const hubOk =
    healthOk(data.health, "so1o-ops-hub") ||
    healthOk(data.health, "hq.") ||
    healthOk(data.health, "ops");
  const overlays: TrackingSyncOverlay[] = [];

  if (so1oOk) {
    const checklistPct = checklistLiveRatio("so1o", data.health);
    overlays.push({
      siteId: "so1o",
      syncedAt,
      boosts: [
        {
          categoryId: "so1o-monitoring",
          featureName: "Health & smoke",
          delta: checklistPct >= 80 ? 3 : 2,
          reason: checklistPct >= 80 ? `Probe OK + checklist ${checklistPct}%` : "Live probe OK",
        },
      ],
    });
  }

  if (an1hemOk) {
    const checklistPct = checklistLiveRatio("an1hem", data.health);
    overlays.push({
      siteId: "an1hem",
      syncedAt,
      boosts: [
        {
          categoryId: "an1hem-monitoring",
          featureName: "Ops Hub alerts",
          delta: checklistPct >= 80 ? 3 : 2,
          reason: checklistPct >= 80 ? `Probe OK + checklist ${checklistPct}%` : "Live probe OK",
        },
      ],
    });
  }

  if (hubOk && data.overall_verdict !== "upgrade_required") {
    overlays.push({
      siteId: "ops_hub",
      syncedAt,
      boosts: [
        {
          categoryId: "ops-phase1",
          featureName: "Infra Monitor (/monitor)",
          delta: data.overall_verdict === "ok" ? 2 : 1,
          reason: `Verdict: ${data.overall_verdict}`,
        },
      ],
    });
  }

  if (funnel && funnel.totals.clicks_7d >= 3) {
    const rate = conversionRate(funnel.totals.clicks_7d, funnel.totals.converted_7d);
    if (rate >= 15) {
      overlays.push({
        siteId: "ops_hub",
        syncedAt,
        boosts: [
          {
            categoryId: "ops-phase1",
            featureName: "ภาพรวม (Overview)",
            delta: rate >= 25 ? 2 : 1,
            reason: `Flywheel conversion ${rate}% (7d)`,
          },
        ],
      });
    }
  }

  return overlays;
}

export function applyTrackingSync(sites: TrackingSite[], overlays: TrackingSyncOverlay[]): TrackingSite[] {
  if (overlays.length === 0) return sites;

  return sites.map((site) => {
    const overlay = overlays.find((o) => o.siteId === site.id);
    if (!overlay?.boosts.length) return site;

    const categories = site.categories.map((cat) => {
      const catBoosts = overlay.boosts.filter((b) => b.categoryId === cat.id);
      if (!catBoosts.length) return cat;

      const features = cat.features.map((f) => {
        const boost = catBoosts.find((b) => b.featureName === f.name);
        if (!boost) return f;
        const percent = Math.min(100, f.percent + boost.delta);
        const alreadySynced = f.done.some((d) => d.startsWith("[sync]"));
        return {
          ...f,
          percent,
          done: alreadySynced ? f.done : [...f.done, `[sync] ${boost.reason}`],
        };
      });

      return { ...cat, features };
    });

    const avg =
      categories.reduce(
        (sum, c) => sum + c.features.reduce((s, f) => s + f.percent, 0) / Math.max(c.features.length, 1),
        0,
      ) / Math.max(categories.length, 1);

    return {
      ...site,
      categories,
      overallPercent: Math.round(avg),
    };
  });
}

export function getSyncedSites(infra: InfraMonitorResponse | undefined, funnel?: EcosystemFunnelData) {
  return applyTrackingSync(ECOSYSTEM_SITES, computeTrackingSyncOverlay(infra, funnel));
}

export function latestSyncTime(overlays: TrackingSyncOverlay[]): string | null {
  if (overlays.length === 0) return null;
  return overlays[0]?.syncedAt ?? null;
}

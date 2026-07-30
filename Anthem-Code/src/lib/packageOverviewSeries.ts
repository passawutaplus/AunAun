import {
  buildProjectViewSeries,
  viewSeriesTrendPercent,
  type ViewSeriesGranularity,
} from "@/lib/projectViewSeries";

export type PackageOverviewMetric = "views" | "hires" | "packages";

export type PackageOverviewPoint = {
  key: string;
  label: string;
  sortAt: number;
  views: number;
  hires: number;
  packages: number;
};

export type PackageOverviewTimestamps = {
  views: string[];
  hires: string[];
  packages: string[];
};

export const PACKAGE_OVERVIEW_METRICS: {
  id: PackageOverviewMetric;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "views",
    label: "คนดูแพ็กเกจ",
    hint: "ผู้ใช้ล็อกอินที่เปิดดูแพ็กเกจของคุณ",
    color: "hsl(var(--primary))",
  },
  {
    id: "hires",
    label: "กดจ้างจากแพ็กเกจ",
    hint: "คำขอจ้างที่เริ่มจากแพ็กเกจ",
    color: "hsl(var(--chat-hire))",
  },
  {
    id: "packages",
    label: "แพ็กเกจใหม่",
    hint: "แพ็กเกจที่เผยแพร่ในช่วงนี้",
    color: "hsl(199 89% 48%)",
  },
];

export function packageOverviewMetricConfig(metric: PackageOverviewMetric) {
  return PACKAGE_OVERVIEW_METRICS.find((item) => item.id === metric) ?? PACKAGE_OVERVIEW_METRICS[0];
}

function asCounts(series: ReturnType<typeof buildProjectViewSeries>) {
  return series.map((point) => point.views);
}

export function buildPackageOverviewSeries(
  timestamps: PackageOverviewTimestamps,
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity,
): PackageOverviewPoint[] {
  const views = buildProjectViewSeries(timestamps.views, from, to, granularity);
  const hires = asCounts(buildProjectViewSeries(timestamps.hires, from, to, granularity));
  const packages = asCounts(buildProjectViewSeries(timestamps.packages, from, to, granularity));

  return views.map((slot, index) => ({
    key: slot.key,
    label: slot.label,
    sortAt: slot.sortAt,
    views: slot.views,
    hires: hires[index] ?? 0,
    packages: packages[index] ?? 0,
  }));
}

export function sumPackageOverviewMetric(
  points: PackageOverviewPoint[],
  metric: PackageOverviewMetric,
): number {
  return points.reduce((sum, point) => sum + point[metric], 0);
}

export function averagePackageOverviewMetric(
  points: PackageOverviewPoint[],
  metric: PackageOverviewMetric,
): number {
  if (!points.length) return 0;
  return sumPackageOverviewMetric(points, metric) / points.length;
}

export { viewSeriesTrendPercent };

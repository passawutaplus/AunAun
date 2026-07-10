import {
  buildProjectViewSeries,
  viewSeriesTrendPercent,
  type ViewSeriesGranularity,
} from "@/lib/projectViewSeries";

export type PortfolioOverviewMetric = "views" | "followers" | "hires" | "collabs" | "works";

export type PortfolioOverviewPoint = {
  key: string;
  label: string;
  sortAt: number;
  views: number;
  followers: number;
  hires: number;
  collabs: number;
  works: number;
};

export type PortfolioOverviewTimestamps = {
  views: string[];
  followers: string[];
  hires: string[];
  collabs: string[];
  works: string[];
};

export const PORTFOLIO_OVERVIEW_METRICS: {
  id: PortfolioOverviewMetric;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "views",
    label: "การเข้าชม",
    hint: "ผู้ชมล็อกอินที่ดูผลงานของคุณ",
    color: "hsl(var(--primary))",
  },
  {
    id: "followers",
    label: "ผู้ติดตาม",
    hint: "คนที่กดติดตามโปรไฟล์ใหม่",
    color: "hsl(142 71% 45%)",
  },
  {
    id: "hires",
    label: "สนใจจ้าง",
    hint: "คำขอจ้างงานที่ได้รับ",
    color: "hsl(var(--chat-hire))",
  },
  {
    id: "collabs",
    label: "สนใจคอลแลป",
    hint: "คำขอคอลแลปที่ได้รับ",
    color: "hsl(262 83% 68%)",
  },
  {
    id: "works",
    label: "ผลงานใหม่",
    hint: "ผลงานที่เผยแพร่ในช่วงนี้",
    color: "hsl(199 89% 48%)",
  },
];

export function portfolioOverviewMetricConfig(metric: PortfolioOverviewMetric) {
  return PORTFOLIO_OVERVIEW_METRICS.find((item) => item.id === metric) ?? PORTFOLIO_OVERVIEW_METRICS[0];
}

function asCounts(series: ReturnType<typeof buildProjectViewSeries>) {
  return series.map((point) => point.views);
}

export function buildPortfolioOverviewSeries(
  timestamps: PortfolioOverviewTimestamps,
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity,
): PortfolioOverviewPoint[] {
  const views = buildProjectViewSeries(timestamps.views, from, to, granularity);
  const followers = asCounts(buildProjectViewSeries(timestamps.followers, from, to, granularity));
  const hires = asCounts(buildProjectViewSeries(timestamps.hires, from, to, granularity));
  const collabs = asCounts(buildProjectViewSeries(timestamps.collabs, from, to, granularity));
  const works = asCounts(buildProjectViewSeries(timestamps.works, from, to, granularity));

  return views.map((slot, index) => ({
    key: slot.key,
    label: slot.label,
    sortAt: slot.sortAt,
    views: slot.views,
    followers: followers[index] ?? 0,
    hires: hires[index] ?? 0,
    collabs: collabs[index] ?? 0,
    works: works[index] ?? 0,
  }));
}

export function sumPortfolioOverviewMetric(
  points: PortfolioOverviewPoint[],
  metric: PortfolioOverviewMetric,
): number {
  return points.reduce((sum, point) => sum + point[metric], 0);
}

export function averagePortfolioOverviewMetric(
  points: PortfolioOverviewPoint[],
  metric: PortfolioOverviewMetric,
): number {
  if (!points.length) return 0;
  return sumPortfolioOverviewMetric(points, metric) / points.length;
}

export { viewSeriesTrendPercent };

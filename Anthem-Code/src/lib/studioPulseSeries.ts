import { buildProjectViewSeries, type ViewSeriesGranularity } from "@/lib/projectViewSeries";

export type StudioPulsePoint = {
  key: string;
  label: string;
  views: number;
};

export function buildStudioPulseSeries(
  views: string[],
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity = "day",
): StudioPulsePoint[] {
  return buildProjectViewSeries(views, from, to, granularity).map((slot) => ({
    key: slot.key,
    label: slot.label,
    views: slot.views,
  }));
}

export function studioPulseHasSignal(points: StudioPulsePoint[]): boolean {
  return points.some((point) => point.views > 0);
}

export function sumStudioPulseViews(points: StudioPulsePoint[]): number {
  return points.reduce((sum, point) => sum + point.views, 0);
}

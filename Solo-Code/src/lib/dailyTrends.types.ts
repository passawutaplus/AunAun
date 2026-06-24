import type { TrendIconKey } from "@/lib/trendIcons";

export interface DailyTrendItem {
  category: string;
  title: string;
  body: string;
  iconKey?: TrendIconKey;
  coverVariant?: number;
  image_url?: string;
  source?: string;
  source_url?: string;
}

export type DailyTrendsStatus = "ready" | "pending";

export interface DailyTrendsResponse {
  date: string;
  items: DailyTrendItem[];
  status: DailyTrendsStatus;
}

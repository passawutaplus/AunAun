import type { DailyTrendItem } from "@/lib/dailyTrends.types";

const GENERIC_IMAGE_PATTERNS = [
  /favicon/i,
  /\/logo[\W_]/i,
  /placeholder/i,
  /1x1\.(png|gif|jpg)/i,
  /pixel\.gif/i,
  /spacer/i,
  /blank\.(png|gif)/i,
];

const FALLBACK_BY_ICON: Record<string, string> = {
  palette: "https://images.unsplash.com/photo-1541701494587-cb585028c6bb?w=800&q=80",
  type: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80",
  sparkles: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
  default: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
};

export function isLikelyGenericFeedImage(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return GENERIC_IMAGE_PATTERNS.some((re) => re.test(trimmed));
}

export function imageDedupeKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function trendCoverFallback(iconKey?: string, _category?: string): string {
  const key = iconKey?.trim() || "default";
  return FALLBACK_BY_ICON[key] ?? FALLBACK_BY_ICON.default!;
}

export function ensureUniqueTrendCovers<T extends Pick<DailyTrendItem, "image_url" | "iconKey" | "category">>(
  items: T[],
): T[] {
  const seen = new Set<string>();

  return items.map((item) => {
    let image_url = item.image_url ?? undefined;

    if (image_url && (isLikelyGenericFeedImage(image_url) || seen.has(imageDedupeKey(image_url)))) {
      image_url = trendCoverFallback(item.iconKey, item.category);
    }

    if (image_url) {
      seen.add(imageDedupeKey(image_url));
    }

    return { ...item, image_url };
  });
}

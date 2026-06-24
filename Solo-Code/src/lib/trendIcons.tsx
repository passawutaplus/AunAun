import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Coins,
  LayoutGrid,
  Lightbulb,
  MessageCircle,
  Newspaper,
  Palette,
  Rocket,
  Sparkles,
  Tag,
  Type,
} from "lucide-react";

export type TrendIconKey =
  | "palette"
  | "type"
  | "bot"
  | "layout"
  | "sparkles"
  | "rocket"
  | "coins"
  | "lightbulb"
  | "tag"
  | "message"
  | "news";

export const TREND_ICONS: Record<TrendIconKey, LucideIcon> = {
  palette: Palette,
  type: Type,
  bot: Bot,
  layout: LayoutGrid,
  sparkles: Sparkles,
  rocket: Rocket,
  coins: Coins,
  lightbulb: Lightbulb,
  tag: Tag,
  message: MessageCircle,
  news: Newspaper,
};

const CATEGORY_ICON: Record<string, TrendIconKey> = {
  สีเทรนด์: "palette",
  Typography: "type",
  "AI Tools": "bot",
  "Design Style": "layout",
  Motion: "sparkles",
  Workflow: "rocket",
  "Pricing Tip": "coins",
  "Client Talk": "message",
  Branding: "tag",
};

export function resolveTrendIconKey(category?: string): TrendIconKey {
  if (!category) return "news";
  const direct = CATEGORY_ICON[category];
  if (direct) return direct;
  const lower = category.toLowerCase();
  if (lower.includes("typo") || lower.includes("font")) return "type";
  if (lower.includes("ai")) return "bot";
  if (lower.includes("color") || lower.includes("สี")) return "palette";
  if (lower.includes("motion") || lower.includes("anim")) return "sparkles";
  if (lower.includes("brand")) return "tag";
  if (lower.includes("price") || lower.includes("money")) return "coins";
  return "news";
}

export type TrendIconSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<TrendIconSize, { box: string; icon: string }> = {
  xs: { box: "h-7 w-7 rounded-md", icon: "h-3.5 w-3.5" },
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14 rounded-xl", icon: "h-7 w-7" },
  xl: { box: "h-20 w-20 rounded-2xl", icon: "h-10 w-10" },
};

export function TrendIcon({
  category,
  iconKey,
  size = "md",
  className = "",
  variant = "soft",
}: {
  category?: string;
  iconKey?: TrendIconKey;
  size?: TrendIconSize;
  className?: string;
  variant?: "soft" | "solid" | "ghost";
}) {
  const key = iconKey ?? resolveTrendIconKey(category);
  const Icon = TREND_ICONS[key];
  const s = SIZE_CLASS[size];
  const variantClass =
    variant === "solid"
      ? "bg-gradient-primary text-primary-foreground shadow-soft"
      : variant === "ghost"
        ? "bg-transparent text-muted-foreground"
        : "bg-primary/10 text-primary border border-primary/15";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${s.box} ${variantClass} ${className}`}
      aria-hidden
    >
      <Icon className={s.icon} strokeWidth={2} />
    </span>
  );
}

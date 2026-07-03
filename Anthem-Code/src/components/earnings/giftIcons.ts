import type { ComponentType } from "react";
import { Gift as GiftIcon, Pencil, Coffee, Highlighter, PenTool, Palette, Laptop } from "lucide-react";

export const GIFT_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Pencil,
  Coffee,
  Highlighter,
  PenTool,
  Palette,
  Laptop,
};

export const giftIcon = (iconKey?: string) =>
  iconKey ? GIFT_ICON_MAP[iconKey] ?? GiftIcon : GiftIcon;

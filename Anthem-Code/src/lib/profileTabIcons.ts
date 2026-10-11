import SavedBookmarkIcon from "@/components/icons/SavedBookmarkIcon";
import { Box, Briefcase, LayoutGrid, Layers3, Library, Lightbulb, Package, Star, UserRound, type LucideIcon } from "lucide-react";

/** One icon per profile tab, looked up by the tab's title so the tab row and the big heading always match. */
const PROFILE_TAB_ICONS: Record<string, LucideIcon> = {
  "my projects": LayoutGrid,
  projects: LayoutGrid,
  collections: Layers3,
  packages: Package,
  "packages saved": SavedBookmarkIcon,
  catalog: Library,
  objects: Box,
  "about me": UserRound,
  reviews: Star,
  hiring: Briefcase,
  inspiration: Lightbulb,
};

export function profileTabIcon(label: unknown): LucideIcon | null {
  return typeof label === "string" ? (PROFILE_TAB_ICONS[label.trim().toLowerCase()] ?? null) : null;
}

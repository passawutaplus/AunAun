import type { BriefDesignDirection } from "@/lib/briefSchema";
import type { CreativeLabHandoff } from "./creativeLabHandoff";

export function mergeCreativeHandoffIntoDirection(
  existing: BriefDesignDirection,
  handoff: CreativeLabHandoff,
): Partial<BriefDesignDirection> {
  const patch: Partial<BriefDesignDirection> = {};
  if (handoff.hexes?.length) {
    const cur = new Set(existing.liked_color_chips ?? []);
    for (const h of handoff.hexes) cur.add(h);
    patch.liked_color_chips = Array.from(cur);
  }
  if (handoff.likedFonts?.trim()) {
    const prev = existing.liked_fonts?.trim();
    patch.liked_fonts = prev
      ? `${prev}\n${handoff.likedFonts.trim()}`
      : handoff.likedFonts.trim();
  }
  return patch;
}

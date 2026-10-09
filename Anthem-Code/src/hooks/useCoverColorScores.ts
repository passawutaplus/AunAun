import { useEffect, useState } from "react";
import {
  peekSearchPalette,
  scorePaletteAgainstColor,
  subscribeSearchPalettes,
  warmSearchPalettes,
} from "@/lib/colorSearch";

export type ColorSearchTarget = { id: string; image: string };

/** Measure cover colors in the background, then score them against the picked hex. */
export function useCoverColorScores(items: ColorSearchTarget[], hex: string | null): {
  scores: Map<string, number>;
  pending: boolean;
  /** Covers whose pixels could not be read. */
  unreadable: number;
  measured: number;
} {
  const [, setTick] = useState(0);

  useEffect(() => subscribeSearchPalettes(() => setTick((n) => n + 1)), []);

  const urlKey = hex
    ? items
        .map((item) => item.image.trim())
        .filter(Boolean)
        .sort()
        .join("\0")
    : "";

  useEffect(() => {
    if (!hex || !urlKey) return;
    warmSearchPalettes(urlKey.split("\0"));
  }, [hex, urlKey]);

  const scores = new Map<string, number>();
  let pending = false;
  let measured = 0;
  let unreadable = 0;
  if (hex) {
    for (const item of items) {
      const url = item.image.trim();
      if (!url) {
        scores.set(item.id, 0);
        continue;
      }
      const palette = peekSearchPalette(url);
      if (palette === undefined) {
        pending = true;
        continue;
      }
      measured += 1;
      if (!palette) unreadable += 1;
      scores.set(item.id, palette ? scorePaletteAgainstColor(hex, palette) : 0);
    }
  }
  return { scores, pending, unreadable, measured };
}

import { useEffect, useState } from "react";
import {
  parseColorList,
  peekSearchPalette,
  scorePaletteAgainstColors,
  subscribeSearchPalettes,
  warmSearchPalettes,
} from "@/lib/colorSearch";

export type ColorSearchTarget = { id: string; image: string };

/** Measure cover colors in the background, then score them against the picked colors ("#a,#b,#c"). */
export function useCoverColorScores(items: ColorSearchTarget[], hex: string | null): {
  scores: Map<string, number>;
  pending: boolean;
  /** Covers whose pixels could not be read. */
  unreadable: number;
  measured: number;
} {
  const [, setTick] = useState(0);
  const hexes = parseColorList(hex);

  useEffect(() => subscribeSearchPalettes(() => setTick((n) => n + 1)), []);

  const urlKey = hexes.length
    ? items
        .map((item) => item.image.trim())
        .filter(Boolean)
        .sort()
        .join("\0")
    : "";

  useEffect(() => {
    if (!hexes.length || !urlKey) return;
    warmSearchPalettes(urlKey.split("\0"));
  }, [hexes.length, urlKey]);

  const scores = new Map<string, number>();
  let pending = false;
  let measured = 0;
  let unreadable = 0;
  if (hexes.length) {
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
      scores.set(item.id, palette ? scorePaletteAgainstColors(hexes, palette) : 0);
    }
  }
  return { scores, pending, unreadable, measured };
}

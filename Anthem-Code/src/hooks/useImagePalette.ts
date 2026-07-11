import { useEffect, useState } from "react";
import { extractImagePalette, fallbackPaletteFromSeed } from "@/lib/imagePalette";

export function useImagePalette(url: string | undefined, count = 4): string[] {
  const [colors, setColors] = useState<string[]>(() =>
    fallbackPaletteFromSeed(url ?? "pending", count),
  );

  useEffect(() => {
    if (!url) {
      setColors(fallbackPaletteFromSeed("empty", count));
      return;
    }
    let cancelled = false;
    setColors(fallbackPaletteFromSeed(url, count));
    void extractImagePalette(url, count).then((next) => {
      if (!cancelled) setColors(next);
    });
    return () => {
      cancelled = true;
    };
  }, [url, count]);

  return colors;
}

import {
  DRILL_DIFFICULTY_META,
  type DrillDifficulty,
} from "@/data/designDrillPrompts";

function parseRangeHint(hint: string): number | null {
  const minMatch = hint.match(/(\d+)\s*นาที/);
  if (minMatch) return parseInt(minMatch[1]!, 10);

  const hrMatch = hint.match(/(\d+(?:\.\d+)?)\s*ชม/);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]!) * 60);

  const rangeMin = hint.match(/(\d+)\s*[–-]\s*(\d+)\s*นาที/);
  if (rangeMin) return parseInt(rangeMin[2]!, 10);

  const rangeHr = hint.match(/(\d+)\s*[–-]\s*(\d+)\s*ชม/);
  if (rangeHr) return parseInt(rangeHr[2]!, 10) * 60;

  return null;
}

export function parseTimeHintToMinutes(
  hint?: string,
  difficulty: DrillDifficulty = "medium",
): number {
  if (hint) {
    const parsed = parseRangeHint(hint);
    if (parsed != null && parsed > 0) return parsed;
  }

  const fallback = DRILL_DIFFICULTY_META[difficulty].hint;
  const fromMeta = parseRangeHint(fallback);
  if (fromMeta != null && fromMeta > 0) return fromMeta;

  return 90;
}

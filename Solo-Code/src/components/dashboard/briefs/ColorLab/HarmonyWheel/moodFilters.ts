import { colord } from "colord";

export type MoodId = "default" | "pastel" | "neon" | "vintage" | "earth";

export const MOODS: { id: MoodId; label: string; emoji: string }[] = [
  { id: "default", label: "Default", emoji: "✨" },
  { id: "pastel", label: "Pastel", emoji: "🌸" },
  { id: "neon", label: "Neon", emoji: "⚡" },
  { id: "vintage", label: "Vintage", emoji: "📻" },
  { id: "earth", label: "Earth", emoji: "🌿" },
];

/** Apply a mood filter on a hex by remapping S/V. */
export function applyMood(hex: string, mood: MoodId): string {
  if (mood === "default") return hex.toUpperCase();
  const hsv = colord(hex).toHsv();
  let s = hsv.s;
  let v = hsv.v;
  switch (mood) {
    case "pastel":
      s = 40;
      v = 95;
      break;
    case "neon":
      s = 100;
      v = 100;
      break;
    case "vintage":
      s = 55;
      v = 70;
      break;
    case "earth":
      s = 45;
      v = 60;
      break;
  }
  return colord({ h: hsv.h, s, v }).toHex().toUpperCase();
}

export function applyMoodToPalette(palette: string[], mood: MoodId): string[] {
  return palette.map((c) => applyMood(c, mood));
}

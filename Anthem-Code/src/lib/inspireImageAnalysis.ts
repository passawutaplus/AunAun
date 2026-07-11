import {
  colorToneLabel,
  hexToRgb,
  hueFamily,
  rgbToHsl,
  toHexColor,
  type HueFamily,
} from "@/lib/imagePalette";

export type InspireVisualAnalysis = {
  keywords: string[];
  glance: string[];
  summary: string;
  tone: string;
};

const FAMILY_KEYWORDS: Record<HueFamily, string[]> = {
  red: ["red", "coral", "bold accent"],
  orange: ["orange", "warm", "earthy"],
  gold: ["gold", "amber", "warm light"],
  green: ["green", "nature", "foliage"],
  teal: ["teal", "cool", "aquatic"],
  blue: ["blue", "sky", "cool"],
  purple: ["purple", "violet", "creative"],
  magenta: ["magenta", "pink", "vivid"],
  neutral: ["neutral", "graphite", "minimal"],
};

const FAMILY_GLANCE: Record<HueFamily, string> = {
  red: "Warm Accent",
  orange: "Earthy Warm",
  gold: "Golden Light",
  green: "Nature / Foliage",
  teal: "Cool Teal",
  blue: "Cool Blue",
  purple: "Violet Mood",
  magenta: "Vivid Pink",
  neutral: "Neutral Study",
};

function uniq(tags: string[], max = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Derive keywords / glance / summary from an extracted hex palette. */
export function analyzeInspirePalette(cssOrHexColors: string[]): InspireVisualAnalysis {
  const hexes = cssOrHexColors.map(toHexColor).filter(Boolean);
  if (!hexes.length) {
    return {
      keywords: ["image", "visual reference"],
      glance: ["Image reference", "Visual"],
      summary: "Image reference saved for future creative direction.",
      tone: "Neutral Tone",
    };
  }

  const stats = hexes.map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    return { hex, ...hsl, family: hueFamily(hex) };
  });

  const primary = stats[0]!;
  const tone = colorToneLabel(primary.hex);
  const avgSat = stats.reduce((s, c) => s + c.s, 0) / stats.length;
  const avgL = stats.reduce((s, c) => s + c.l, 0) / stats.length;
  const lSpread = Math.max(...stats.map((c) => c.l)) - Math.min(...stats.map((c) => c.l));

  const keywords: string[] = ["visual reference", "image"];
  keywords.push(...(FAMILY_KEYWORDS[primary.family] ?? []).slice(0, 2));

  for (const c of stats.slice(1, 4)) {
    if (c.family !== primary.family && c.s > 14) {
      keywords.push(...(FAMILY_KEYWORDS[c.family] ?? []).slice(0, 1));
    }
  }

  if (avgSat < 14) keywords.push("monochrome", "minimal");
  else if (avgSat > 45) keywords.push("vivid", "bold color");
  else keywords.push("muted palette");

  if (avgL > 72) keywords.push("high-key", "airy");
  else if (avgL < 28) keywords.push("low-key", "moody");
  else keywords.push("midtone");

  if (lSpread > 45) keywords.push("high contrast");
  else if (lSpread < 18) keywords.push("soft contrast");

  if (primary.family === "green" && avgSat > 18) keywords.push("outdoor", "landscape");
  if (primary.family === "blue" && avgL > 40) keywords.push("open sky");
  if (primary.family === "neutral" && avgL < 40) keywords.push("workspace", "product");

  const glance = uniq(
    [
      FAMILY_GLANCE[primary.family] ?? "Visual",
      tone,
      avgSat > 40 ? "Saturated Palette" : avgSat < 16 ? "Desaturated" : "Balanced Palette",
      lSpread > 45 ? "High Contrast" : avgL > 70 ? "Light Atmosphere" : avgL < 30 ? "Dark Atmosphere" : "",
    ].filter(Boolean),
    3,
  );

  const familyWord =
    primary.family === "green"
      ? "green / nature"
      : primary.family === "blue" || primary.family === "teal"
        ? "cool"
        : primary.family === "neutral"
          ? "neutral"
          : primary.family === "red" || primary.family === "orange" || primary.family === "gold"
            ? "warm"
            : primary.family;

  const satWord = avgSat > 40 ? "vivid" : avgSat < 16 ? "soft muted" : "balanced";
  const lightWord = avgL > 70 ? "airy" : avgL < 28 ? "moody" : "midtone";

  const summary = `${tone} ${familyWord} reference with a ${satWord}, ${lightWord} palette — useful for creative direction and moodboarding.`;

  return {
    keywords: uniq(keywords, 10),
    glance,
    summary,
    tone,
  };
}

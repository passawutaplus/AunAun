/** Deterministic text-cover styling for media-less community posts (FB-style). */

export type CommunityTextCoverTheme = {
  id: string;
  background: string;
};

const THEMES: CommunityTextCoverTheme[] = [
  {
    id: "ember",
    background:
      "radial-gradient(ellipse 120% 80% at 50% 100%, #ff6b35 0%, #c1121f 45%, #1a0a0a 100%)",
  },
  {
    id: "sunset",
    background:
      "radial-gradient(ellipse 100% 90% at 20% 80%, #f9c74f 0%, #f3722c 40%, #6a040f 100%)",
  },
  {
    id: "ocean",
    background:
      "radial-gradient(ellipse 110% 85% at 80% 20%, #48cae4 0%, #0077b6 50%, #03045e 100%)",
  },
  {
    id: "violet",
    background:
      "radial-gradient(ellipse 100% 100% at 50% 50%, #b5179e 0%, #560bad 55%, #10002b 100%)",
  },
  {
    id: "forest",
    background:
      "radial-gradient(ellipse 90% 80% at 30% 70%, #52b788 0%, #2d6a4f 45%, #081c15 100%)",
  },
  {
    id: "slate",
    background:
      "radial-gradient(ellipse 100% 90% at 50% 0%, #495057 0%, #212529 60%, #0b0c10 100%)",
  },
  {
    id: "aplus",
    background:
      "radial-gradient(ellipse 110% 90% at 50% 100%, hsl(var(--primary)) 0%, #9a3412 50%, #1c1917 100%)",
  },
];

export const COMMUNITY_TEXT_COVER_THEMES = THEMES;
export const DEFAULT_COMMUNITY_TEXT_COVER_THEME = "violet";

export function getCommunityTextCoverTheme(id: string | null | undefined): CommunityTextCoverTheme | null {
  if (!id) return null;
  return THEMES.find((t) => t.id === id) ?? null;
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Bias theme from composer template tags when possible. */
export function pickCommunityTextCoverTheme(seed: string, tags: string[] = []): CommunityTextCoverTheme {
  const normalized = tags.map((t) => t.toLowerCase());
  if (normalized.some((t) => t.includes("workflow"))) return THEMES[0]!;
  if (normalized.some((t) => t.includes("feedback") || t.includes("ถาม"))) return THEMES[2]!;
  if (normalized.some((t) => t.includes("ราคา") || t.includes("pricing"))) return THEMES[1]!;
  const idx = hashString(seed || "default") % THEMES.length;
  return THEMES[idx] ?? THEMES[0]!;
}

export function resolveCommunityTextCoverTheme(
  themeId: string | null | undefined,
  seed: string,
  tags: string[] = [],
): CommunityTextCoverTheme {
  return getCommunityTextCoverTheme(themeId) ?? pickCommunityTextCoverTheme(seed, tags);
}

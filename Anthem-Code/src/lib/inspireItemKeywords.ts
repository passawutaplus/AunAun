import { analyzeInspirePalette } from "@/lib/inspireImageAnalysis";

const KEYWORD_PREFIX = "aplus1.inspire.item.keywords.";

export type StoredInspireKeywords = {
  version: 1;
  /** When true, do not overwrite with auto-analysis. */
  userEdited: boolean;
  keywords: string[];
};

const LEGACY_DEFAULTS = ["image", "visual reference"];

function isLegacyDefault(keywords: string[]): boolean {
  if (keywords.length !== 2) return false;
  const set = new Set(keywords.map((k) => k.toLowerCase()));
  return set.has("image") && set.has("visual reference");
}

export function readInspireKeywordsState(itemId: string): StoredInspireKeywords | null {
  try {
    const raw = localStorage.getItem(`${KEYWORD_PREFIX}${itemId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const keywords = parsed.map(String).filter(Boolean).slice(0, 16);
      return {
        version: 1,
        userEdited: !isLegacyDefault(keywords),
        keywords,
      };
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.keywords)) {
      return {
        version: 1,
        userEdited: !!parsed.userEdited,
        keywords: parsed.keywords.map(String).filter(Boolean).slice(0, 16),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Resolve keywords for display — prefers user edits, else auto from palette. */
export function resolveInspireKeywords(
  itemId: string,
  paletteCssOrHex: string[],
): { keywords: string[]; userEdited: boolean } {
  const stored = readInspireKeywordsState(itemId);
  if (stored?.userEdited && stored.keywords.length) {
    return { keywords: stored.keywords, userEdited: true };
  }
  const analyzed = analyzeInspirePalette(paletteCssOrHex).keywords;
  if (analyzed.length) return { keywords: analyzed, userEdited: false };
  return { keywords: stored?.keywords?.length ? stored.keywords : LEGACY_DEFAULTS, userEdited: false };
}

/** @deprecated Prefer resolveInspireKeywords — kept for simple reads. */
export function readInspireKeywords(itemId: string): string[] {
  const stored = readInspireKeywordsState(itemId);
  if (!stored) return LEGACY_DEFAULTS;
  return stored.keywords.length ? stored.keywords : LEGACY_DEFAULTS;
}

export function writeInspireKeywords(
  itemId: string,
  keywords: string[],
  opts?: { userEdited?: boolean },
): void {
  try {
    const payload: StoredInspireKeywords = {
      version: 1,
      userEdited: opts?.userEdited ?? true,
      keywords: keywords.slice(0, 16),
    };
    localStorage.setItem(`${KEYWORD_PREFIX}${itemId}`, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

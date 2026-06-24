/**
 * Article helpers — slug generation, category metadata, gradient placeholders.
 * Pure utilities, safe to import from both client and server code.
 */

export const ARTICLE_CATEGORIES = [
  "Finance",
  "Management",
  "Marketing",
  "Legal",
  "Productivity",
  "Portfolio",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const CATEGORY_LABEL_TH: Record<ArticleCategory, string> = {
  Finance: "การเงิน",
  Management: "การบริหาร",
  Marketing: "การตลาด",
  Legal: "กฎหมาย/ภาษี",
  Productivity: "Productivity",
  Portfolio: "พอร์ตโฟลิโอ",
};

/**
 * Tailwind gradient classes per category — used as featured-image fallback.
 * Pair with white text for the title overlay.
 */
export const CATEGORY_GRADIENT: Record<ArticleCategory, string> = {
  Finance: "from-emerald-500 via-teal-500 to-cyan-600",
  Management: "from-violet-500 via-purple-500 to-indigo-600",
  Marketing: "from-pink-500 via-rose-500 to-orange-500",
  Legal: "from-slate-600 via-slate-700 to-zinc-800",
  Productivity: "from-amber-400 via-orange-500 to-red-500",
  Portfolio: "from-blue-500 via-indigo-500 to-purple-600",
};

/** Convert a Thai/English title into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFC")
      .toLowerCase()
      .trim()
      // remove control + punctuation but keep Thai letters & alphanumerics & spaces & hyphens
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96)
  );
}

/** Strip HTML tags for plain-text excerpts (meta descriptions, summaries). */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimate reading time in minutes (~200 wpm Thai/English mix). */
export function readingTimeMin(html: string): number {
  const text = stripHtml(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  // Thai reading is char-based; combine: every Thai char ≈ 0.5 word
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const effective = words + thaiChars * 0.5;
  return Math.max(1, Math.round(effective / 200));
}

export function isValidCategory(c: string): c is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(c);
}

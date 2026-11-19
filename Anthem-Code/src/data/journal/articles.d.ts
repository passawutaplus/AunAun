export type JournalCategoryId = "design" | "branding" | "people" | "career" | "art" | "culture";

export type JournalBlock =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { quote: string };

export interface JournalSource {
  title: string;
  publisher: string;
  url: string;
}

export interface JournalArticle {
  slug: string;
  category: JournalCategoryId;
  titleEn: string;
  title: string;
  description: string;
  image: { src: string; alt: string; credit: string };
  author: string;
  datePublished: string;
  dateModified: string;
  readMinutes: number;
  tags: string[];
  body: JournalBlock[];
  /** Required. First 2 are shown; the rest fold under "more sources". */
  sources: JournalSource[];
}

export const JOURNAL_CATEGORIES: Record<
  JournalCategoryId,
  { id: JournalCategoryId; label: string; labelTh: string }
>;
export const JOURNAL_ARTICLES: JournalArticle[];
export function getJournalArticle(slug: string): JournalArticle | undefined;
export function journalArticlePath(slug: string): string;
export function sortedJournalArticles(): JournalArticle[];

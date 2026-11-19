export type JournalCategoryId = "design" | "people" | "art";

export type JournalBlock =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { quote: string };

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
}

export const JOURNAL_CATEGORIES: Record<
  JournalCategoryId,
  { id: JournalCategoryId; label: string; labelTh: string }
>;
export const JOURNAL_ARTICLES: JournalArticle[];
export function getJournalArticle(slug: string): JournalArticle | undefined;
export function journalArticlePath(slug: string): string;
export function sortedJournalArticles(): JournalArticle[];

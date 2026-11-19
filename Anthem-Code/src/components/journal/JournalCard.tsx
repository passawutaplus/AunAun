import { Link } from "react-router-dom";
import { JOURNAL_CATEGORIES, journalArticlePath, type JournalArticle } from "@/data/journal/articles";
import { formatJournalDate } from "@/components/journal/formatDate";
import { cn } from "@/lib/utils";

type Props = {
  article: JournalArticle;
  /** ภาพใหญ่ข้างบน (การ์ดเด่น) หรือภาพเล็กในรายการ */
  size?: "feature" | "regular";
  className?: string;
};

/** การ์ดบทความ: ภาพนำ หมวด ชื่ออังกฤษนำ ชื่อไทย และสรุปสั้น ๆ */
export default function JournalCard({ article, size = "regular", className }: Props) {
  const cat = JOURNAL_CATEGORIES[article.category];
  return (
    <article className={cn("group", className)}>
      <Link
        to={journalArticlePath(article.slug)}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="overflow-hidden rounded-lg bg-muted">
          <img
            src={article.image.src}
            alt={article.image.alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none",
              size === "feature" ? "aspect-[16/9]" : "aspect-[4/3]",
            )}
          />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-foreground">{cat.label}</span>
          <span aria-hidden> · </span>
          {article.readMinutes} min read
        </p>
        <h3
          className={cn(
            "mt-2 leading-[1.2] tracking-tight",
            size === "feature" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
          )}
        >
          {article.titleEn}
        </h3>
        <p
          className={cn(
            "thai-display mt-1 font-medium text-foreground/90",
            size === "feature" ? "text-lg sm:text-xl" : "text-base",
          )}
        >
          {article.title}
        </p>
        <p className="thai-body mt-2 line-clamp-3 text-sm text-muted-foreground">{article.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{formatJournalDate(article.datePublished)}</p>
      </Link>
    </article>
  );
}

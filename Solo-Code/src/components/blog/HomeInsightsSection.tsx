import { Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { listPublishedArticles } from "@/server/articles.functions";
import { ArticleCard, type ArticleCardData } from "@/components/blog/ArticleCard";

const ARTICLE_GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";

function ArticleCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden animate-pulse"
    >
      <div className="aspect-[16/9] bg-muted" />
      <div className="flex flex-col gap-2 p-4 min-h-[140px]">
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function HomeInsightsSection() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const [inView, setInView] = React.useState(false);
  const [articles, setArticles] = React.useState<ArticleCardData[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Defer mount until section nears viewport — saves the server-fn call
  // and JSON download for users who never scroll this far.
  React.useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      // Start early so the cards (or the "no articles" collapse) settle well
      // before the section scrolls into view — otherwise the page height jumps
      // under the reader's thumb.
      { rootMargin: "1200px 0px" },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!inView) return;
    let alive = true;
    listPublishedArticles({ data: { limit: 3 } })
      .then((res) => {
        if (!alive) return;
        setArticles((res.articles ?? []) as ArticleCardData[]);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [inView]);

  if (inView && !loading && articles.length === 0) return null;

  return (
    <section ref={sectionRef} id="insights" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground mb-3">
            <BookOpen className="h-3 w-3 text-primary" />
            Freelance Insights
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">บทความสำหรับฟรีแลนซ์ไทย</h3>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl">
            เทคนิคคิดราคา ภาษี การจัดการลูกค้า และเครื่องมือที่ใช้ได้จริง — อัปเดตทุกสัปดาห์
          </p>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          ดูทั้งหมด <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Skeleton and loaded state share the same grid + card proportions
          (16:9 cover + text body) so swapping them does not move the page. */}
      <div className={ARTICLE_GRID_CLASS}>
        {!inView || loading
          ? [0, 1, 2].map((i) => <ArticleCardSkeleton key={i} />)
          : articles.map((a) => <ArticleCard key={a.slug} a={a} />)}
      </div>
    </section>
  );
}

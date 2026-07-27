import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { FadeUp } from "@/components/motion/FadeUp";
import { HelpAuthLink } from "@/components/help/HelpAuthLink";
import { findHelpArticleBySlug, getHelpArticle } from "@/data/helpContent";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL, FORUM_PATH } from "@/lib/brandConfig";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HelpArticlePage() {
  const { categoryId, slug } = useParams<{ categoryId: string; slug: string }>();
  const match =
    categoryId && slug ? getHelpArticle(categoryId, slug) : undefined;

  if (!match) {
    return <Navigate to="/help" replace />;
  }

  const { category, article } = match;
  const related = (article.related ?? [])
    .map((relSlug) => findHelpArticleBySlug(relSlug))
    .filter(Boolean) as NonNullable<ReturnType<typeof findHelpArticleBySlug>>[];

  return (
    <>
      <SeoHead
        path={`/help/${category.id}/${article.slug}`}
        title={`${article.title} · Help · ${BRAND_NAME}`}
        description={article.summary}
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <FadeUp>
          <Link
            to={`/help/${category.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {category.title}
          </Link>

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {category.title}
          </p>
          <h1 className="thai-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground thai-body">{article.summary}</p>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
            {article.body.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
        </FadeUp>

        {article.steps && article.steps.length > 0 ? (
          <FadeUp delay={0.08}>
            <ol className="mt-8 space-y-3">
              {article.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm sm:text-base">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </FadeUp>
        ) : null}

        {article.links && article.links.length > 0 ? (
          <FadeUp delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-2">
              {article.links.map((link) => (
                <HelpAuthLink
                  key={link.to + link.label}
                  to={link.to}
                  auth={link.auth}
                  className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
                >
                  {link.label}
                </HelpAuthLink>
              ))}
            </div>
          </FadeUp>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-12 border-t border-border/50 pt-8">
            <h2 className="text-sm font-semibold text-foreground">บทความที่เกี่ยวข้อง</h2>
            <ul className="mt-3 space-y-1">
              {related.map(({ category: relCat, article: rel }) => (
                <li key={rel.slug}>
                  <Link
                    to={`/help/${relCat.id}/${rel.slug}`}
                    className="group inline-flex items-center gap-1.5 py-1.5 text-sm text-primary hover:underline"
                  >
                    {rel.title}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-border/60 bg-background/50 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">ยังไม่เจอคำตอบ?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ถามใน Forum หรืออีเมล{" "}
            <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {BRAND_SUPPORT_EMAIL}
            </a>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            <Link to={FORUM_PATH} className="text-primary hover:underline">
              Forum
            </Link>
            <Link to="/learn" className="text-primary hover:underline">
              Learn more
            </Link>
            <Link to="/help" className="text-primary hover:underline">
              Help Center
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}

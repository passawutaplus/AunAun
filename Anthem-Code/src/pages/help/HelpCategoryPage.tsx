import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { FadeUp } from "@/components/motion/FadeUp";
import { articleCountLabel, getHelpCategory } from "@/data/helpContent";
import { BRAND_NAME } from "@/lib/brandConfig";

export default function HelpCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = categoryId ? getHelpCategory(categoryId) : undefined;

  if (!category) {
    return <Navigate to="/help" replace />;
  }

  if (category.hubTo) {
    return <Navigate to={category.hubTo} replace />;
  }

  const Icon = category.icon;

  return (
    <>
      <SeoHead
        path={`/help/${category.id}`}
        title={`${category.title} · Help · ${BRAND_NAME}`}
        description={category.description}
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <FadeUp>
          <Link
            to="/help"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Help Center
          </Link>

          <div className="mt-6 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="thai-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {category.title}
              </h1>
              <p className="mt-2 text-muted-foreground">{category.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {articleCountLabel(category.articles.length)}
              </p>
            </div>
          </div>
        </FadeUp>

        <ul className="mt-10 space-y-2">
          {category.articles.map((article, i) => (
            <FadeUp key={article.slug} delay={(i % 6) * 0.03}>
              <li>
                <Link
                  to={`/help/${category.id}/${article.slug}`}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-accent/40 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-foreground">{article.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {article.summary}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            </FadeUp>
          ))}
        </ul>
      </section>
    </>
  );
}

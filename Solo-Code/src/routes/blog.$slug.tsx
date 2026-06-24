import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { safeHref } from "@/lib/security";
import * as React from "react";
import {
  getArticleBySlug,
  incrementArticleView,
  listPublishedArticles,
} from "@/server/articles.functions";
import { ArticleCard, type ArticleCardData } from "@/components/blog/ArticleCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Sparkles, Clock, Eye } from "lucide-react";
import {
  CATEGORY_GRADIENT,
  CATEGORY_LABEL_TH,
  isValidCategory,
  readingTimeMin,
  stripHtml,
} from "@/lib/articleHelpers";
import DOMPurify from "isomorphic-dompurify";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { LineHeaderButton } from "@/components/LineContactButton";
import { SiteFooter } from "@/components/layout/SiteFooter";

const SITE_URL = "https://solofreelancer.com";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const [{ article }, { articles: all }] = await Promise.all([
      getArticleBySlug({ data: { slug: params.slug } }),
      listPublishedArticles({ data: { limit: 12 } }),
    ]);
    if (!article) throw notFound();
    const related = (all as ArticleCardData[])
      .filter((a) => a.slug !== article.slug && a.category === article.category)
      .slice(0, 3);
    return { article, related };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.article) return { meta: [{ title: "ไม่พบบทความ" }] };
    const a = loaderData.article;
    const url = `${SITE_URL}/blog/${a.slug}`;
    const desc = (a.meta_description || a.summary || stripHtml(a.content).slice(0, 160)).slice(
      0,
      160,
    );
    const title = a.meta_title || a.title;
    const image = a.featured_image || logoUrl;
    return {
      meta: [
        { title: `${title} | So1o Freelancer` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: image },
        { property: "article:published_time", content: a.published_at || "" },
        { property: "article:section", content: a.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: desc,
            image: [image],
            datePublished: a.published_at,
            dateModified: a.updated_at,
            author: { "@type": "Organization", name: "So1o Freelancer" },
            publisher: {
              "@type": "Organization",
              name: "So1o Freelancer",
              logo: { "@type": "ImageObject", url: `${SITE_URL}${logoUrl}` },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <HttpErrorPage
      kind="article"
      code={404}
      showRetry={false}
      extraAction={{
        labelTh: "กลับไปหน้ารวมบทความ",
        labelEn: "All articles",
        to: "/blog",
      }}
    />
  ),
  errorComponent: ({ error }) => (
    <HttpErrorPage kind="500" code={500} errorMessage={error.message} />
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article, related } = Route.useLoaderData();
  const category = (
    isValidCategory(article.category) ? article.category : "Management"
  ) as keyof typeof CATEGORY_GRADIENT;
  const gradient = CATEGORY_GRADIENT[category];
  const labelTh = CATEGORY_LABEL_TH[category];
  const readMin = readingTimeMin(article.content);

  React.useEffect(() => {
    // fire-and-forget view bump
    incrementArticleView({ data: { slug: article.slug } }).catch(() => {});
  }, [article.slug]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/blog"
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>บทความทั้งหมด</span>
          </Link>
          <div className="flex items-center gap-2">
            <LineHeaderButton />
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">เข้าสู่แอป</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-8">
          <Badge variant="outline" className="mb-3">
            {labelTh}
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              {article.summary}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            {article.published_at && (
              <time dateTime={article.published_at}>
                {new Date(article.published_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readMin} นาที
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {article.view_count}
            </span>
          </div>
        </div>

        {/* Featured image */}
        <div className="rounded-3xl overflow-hidden mb-8 shadow-elevated">
          {article.featured_image ? (
            <img
              src={article.featured_image}
              alt={article.featured_image_alt || article.title}
              className="w-full aspect-[16/9] object-cover"
            />
          ) : (
            <div
              className={`w-full aspect-[16/9] bg-gradient-to-br ${gradient} flex items-center justify-center p-8`}
              aria-hidden="true"
            >
              <span className="text-white/95 text-2xl sm:text-4xl font-bold tracking-tight text-center drop-shadow">
                {article.title}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article body */}
          <article
            className="lg:col-span-2 prose prose-base sm:prose-lg max-w-none prose-headings:tracking-tight prose-a:text-primary"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.content, { USE_PROFILES: { html: true } }),
            }}
          />

          {/* Sidebar CTA */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {article.related_feature_link && (
                <div className="rounded-2xl border border-border bg-gradient-primary p-5 text-primary-foreground shadow-elevated">
                  <Sparkles className="h-6 w-6 mb-3" />
                  <h3 className="text-base font-bold leading-snug">
                    ลองใช้ฟีเจอร์ที่เกี่ยวข้องในแอป
                  </h3>
                  <p className="mt-1.5 text-xs opacity-90 leading-relaxed">
                    นำสิ่งที่อ่านมาใช้จริงในงานคุณได้ทันทีบน So1o Freelancer
                  </p>
                  {(() => {
                    const safe = article.related_feature_link
                      ? safeHref(article.related_feature_link)
                      : null;
                    return safe ? (
                      <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                        <a href={safe}>
                          เปิดฟีเจอร์
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <h4 className="text-sm font-semibold mb-2">เริ่มต้นใช้ So1o ฟรี</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  หลังบ้านครบวงจรสำหรับฟรีแลนซ์ — ใบเสนอราคา การเงิน พอร์ต
                </p>
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link to="/apply">สมัครเข้ากลุ่มบุกเบิก</Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-6">
              บทความที่เกี่ยวข้อง
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((a: ArticleCardData) => (
                <ArticleCard key={a.slug} a={a} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter variant="minimal" />
    </div>
  );
}

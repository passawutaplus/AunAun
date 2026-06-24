import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { listPublishedArticles } from "@/server/articles.functions";
import { ArticleCard, type ArticleCardData } from "@/components/blog/ArticleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { ARTICLE_CATEGORIES, CATEGORY_LABEL_TH } from "@/lib/articleHelpers";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { LineHeaderButton } from "@/components/LineContactButton";
import { SiteFooter } from "@/components/layout/SiteFooter";

const SITE_URL = "https://solofreelancer.com";

export const Route = createFileRoute("/blog/")({
  head: ({ loaderData }) => ({
    meta: [
      { title: "บทความฟรีแลนซ์ — Insights & Resources | So1o Freelancer" },
      {
        name: "description",
        content:
          "รวมบทความสำหรับฟรีแลนซ์ไทย: ใบเสนอราคา ภาษี การจัดการลูกค้า พอร์ตโฟลิโอ และเทคนิคการทำงานคนเดียวให้เป็นระบบ",
      },
      { property: "og:title", content: "บทความฟรีแลนซ์ — Insights & Resources" },
      {
        property: "og:description",
        content: "ความรู้และเทคนิคสำหรับฟรีแลนซ์ไทย จาก So1o Freelancer",
      },
      { property: "og:url", content: `${SITE_URL}/blog` },
      { property: "og:type", content: "website" },
      { property: "og:image", content: logoUrl },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "บทความฟรีแลนซ์ — Insights & Resources",
          url: `${SITE_URL}/blog`,
          inLanguage: "th-TH",
          isPartOf: { "@type": "WebSite", name: "So1o Freelancer", url: `${SITE_URL}/` },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: (loaderData?.articles ?? [])
              .slice(0, 20)
              .map((a: ArticleCardData, i: number) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/blog/${a.slug}`,
                name: a.title,
              })),
          },
        }),
      },
    ],
  }),
  loader: async () => {
    const res = await listPublishedArticles({ data: { limit: 50 } });
    return { articles: res.articles as ArticleCardData[] };
  },
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: BlogHubPage,
});

function BlogHubPage() {
  const { articles } = Route.useLoaderData();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a: ArticleCardData) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
    });
  }, [articles, search, category]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-semibold">So1o Freelancer</span>
          </Link>
          <div className="flex items-center gap-2">
            <LineHeaderButton />
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">เข้าสู่แอป</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Freelance Insights & Resources
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            รวมบทความและเทคนิคจริงสำหรับฟรีแลนซ์ไทย — จากการทำใบเสนอราคา ภาษี ไปจนถึงการอัปค่าตัว
          </p>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาบทความ…"
              aria-label="ค้นหาบทความ"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70 text-foreground"
            }`}
          >
            ทั้งหมด
          </button>
          {ARTICLE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/70 text-foreground"
              }`}
            >
              {CATEGORY_LABEL_TH[c]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            ไม่พบบทความที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((a: ArticleCardData) => (
              <ArticleCard key={a.slug} a={a} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter variant="minimal" />
    </div>
  );
}

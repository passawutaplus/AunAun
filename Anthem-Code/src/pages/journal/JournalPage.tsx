import { useMemo, useState } from "react";
import SeoHead from "@/components/SeoHead";
import Footer from "@/components/Footer";
import JournalCard from "@/components/journal/JournalCard";
import { JOURNAL_CATEGORIES, sortedJournalArticles, type JournalCategoryId } from "@/data/journal/articles";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seoSchemas";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

const TITLE = "Journal — เรื่องราวด้านดีไซน์ ผู้คน และศิลปะ";
const DESCRIPTION =
  "บทความจากทีม SAMECOR เกี่ยวกับดีไซน์ ครีเอเตอร์ และศิลปะ เขียนให้คนทำงานสร้างสรรค์อ่านแล้วเอาไปใช้ต่อได้ทันที";

export default function JournalPage() {
  const all = useMemo(() => sortedJournalArticles(), []);
  const [cat, setCat] = useState<JournalCategoryId | "all">("all");
  const list = cat === "all" ? all : all.filter((a) => a.category === cat);
  const [feature, ...rest] = list;

  return (
    <main id="main-content" className={cn("min-h-screen bg-background text-foreground", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title={TITLE}
        description={DESCRIPTION}
        path="/journal"
        image={all[0] ? absoluteUrl(all[0].image.src) : undefined}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: TITLE,
            description: DESCRIPTION,
            url: absoluteUrl("/journal"),
            inLanguage: "th",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: all.map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(`/journal/${a.slug}`),
                name: a.title,
              })),
            },
          },
          breadcrumbJsonLd([
            { name: "SAMECOR", path: "/" },
            { name: "Journal", path: "/journal" },
          ]),
        ]}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:pt-12">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">SAMECOR</p>
          <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">Journal</h1>
          <p className="thai-body mt-3 max-w-xl text-base text-muted-foreground">
            เรื่องราวด้านดีไซน์ ผู้คน และศิลปะ จากทีม SAMECOR
          </p>
        </header>

        <nav aria-label="หมวดบทความ" className="mt-8 flex flex-wrap gap-2">
          {(["all", ...Object.keys(JOURNAL_CATEGORIES)] as const).map((id) => {
            const active = cat === id;
            const label = id === "all" ? "All" : JOURNAL_CATEGORIES[id as JournalCategoryId].label;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setCat(id as JournalCategoryId | "all")}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground/80 hover:border-foreground/40",
                )}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {feature ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <JournalCard article={feature} size="feature" />
            <div className="grid gap-10">
              {rest.slice(0, 2).map((a) => (
                <JournalCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        ) : null}

        {rest.length > 2 ? (
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(2).map((a) => (
              <JournalCard key={a.slug} article={a} />
            ))}
          </div>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}

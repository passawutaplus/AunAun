import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { FadeUp } from "@/components/motion/FadeUp";
import { Input } from "@/components/ui/input";
import {
  HELP_CATEGORIES,
  HELP_HOT_KEYWORDS,
  articleCountLabel,
  getPopularHelpArticles,
  searchHelpArticles,
} from "@/data/helpContent";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL, FORUM_PATH } from "@/lib/brandConfig";
import { cn } from "@/lib/utils";

export default function HelpHubPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelpArticles(query), [query]);
  const popular = useMemo(() => getPopularHelpArticles(), []);
  const searching = query.trim().length > 0;

  return (
    <>
      <SeoHead
        path="/help"
        title={`Help Center · ${BRAND_NAME}`}
        description="คำถามที่พบบ่อยและวิธีใช้ Aplus1 — ลงผลงาน ค้นพบ แชทจากผลงาน และบัญชี"
      />

      <section className="mx-auto max-w-5xl px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
        <FadeUp>
          <h1 className="thai-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            ช่วยเหลืออะไรดี?
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground thai-body">
            ค้นหาคำตอบหรือเลือกหมวด — ถ้าอยากเข้าใจภาพรวมของ {BRAND_NAME} ไปที่ Learn more
          </p>

          <label className="relative mt-8 block max-w-2xl">
            <span className="sr-only">ค้นหาบทความ</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาบทความ…"
              className="h-12 rounded-xl border-border/70 bg-background pl-10 text-base shadow-none"
              autoComplete="off"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {HELP_HOT_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setQuery(kw)}
                className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {kw}
              </button>
            ))}
          </div>
        </FadeUp>
      </section>

      {searching ? (
        <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">
            ผลการค้นหา {results.length > 0 ? `(${results.length})` : ""}
          </h2>
          {results.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              ไม่พบบทความที่ตรงกับ “{query.trim()}” — ลองคำอื่น หรือถามใน{" "}
              <Link to={FORUM_PATH} className="text-primary hover:underline">
                Forum
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {results.map(({ category, article }) => (
                <li key={`${category.id}-${article.slug}`}>
                  <Link
                    to={`/help/${category.id}/${article.slug}`}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">{category.title}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-foreground">
                        {article.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{article.summary}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                const to = cat.hubTo ?? `/help/${cat.id}`;
                return (
                  <FadeUp key={cat.id} delay={(i % 3) * 0.04}>
                    <li>
                      <Link
                        to={to}
                        className={cn(
                          "flex h-full flex-col rounded-2xl border border-border/60 bg-background/70 p-5 transition-colors",
                          "hover:border-primary/40 hover:bg-accent/30",
                        )}
                      >
                        <Icon className="h-5 w-5 text-primary" aria-hidden />
                        <span className="mt-4 text-base font-semibold text-foreground">{cat.title}</span>
                        <span className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {cat.description}
                        </span>
                        <span className="mt-4 text-xs text-muted-foreground">
                          {cat.hubMeta ?? articleCountLabel(cat.articles.length)}
                        </span>
                      </Link>
                    </li>
                  </FadeUp>
                );
              })}
            </ul>
          </section>

          <section className="border-t border-border/40">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
              <h2 className="thai-display text-xl font-semibold tracking-tight sm:text-2xl">
                คำถามยอดนิยม
              </h2>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {popular.map(({ category, article }) => (
                  <li key={article.slug}>
                    <Link
                      to={`/help/${category.id}/${article.slug}`}
                      className="group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0">{article.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-t border-border/40">
            <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:px-6 sm:pb-14">
              <h2 className="text-base font-semibold text-foreground">ยังหาไม่เจอ?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                ถามใน Forum หรืออีเมล{" "}
                <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {BRAND_SUPPORT_EMAIL}
                </a>
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
                <Link to={FORUM_PATH} className="text-primary hover:underline">
                  Forum
                </Link>
                <Link to="/learn" className="text-primary hover:underline">
                  Learn more
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

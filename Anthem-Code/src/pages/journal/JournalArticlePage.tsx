import { Navigate, useParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import SeoBreadcrumb from "@/components/seo/SeoBreadcrumb";
import Footer from "@/components/Footer";
import JournalCard from "@/components/journal/JournalCard";
import { formatJournalDate } from "@/components/journal/formatDate";
import {
  getJournalArticle,
  JOURNAL_CATEGORIES,
  sortedJournalArticles,
  type JournalBlock,
} from "@/data/journal/articles";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seoSchemas";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

function Block({ block }: { block: JournalBlock }) {
  if ("h" in block) {
    return <h2 className="thai-display mt-10 text-xl font-medium tracking-tight sm:text-2xl">{block.h}</h2>;
  }
  if ("ul" in block) {
    return (
      <ul className="thai-body mt-4 list-disc space-y-2 pl-6 text-base text-foreground/90">
        {block.ul.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if ("quote" in block) {
    return (
      <blockquote className="thai-display my-10 border-l-2 border-primary pl-5 text-xl font-medium sm:text-2xl">
        {block.quote}
      </blockquote>
    );
  }
  return <p className="thai-body mt-4 text-base text-foreground/90">{block.p}</p>;
}

export default function JournalArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getJournalArticle(slug) : undefined;
  if (!article) return <Navigate to="/journal" replace />;

  const cat = JOURNAL_CATEGORIES[article.category];
  const path = `/journal/${article.slug}`;
  const url = absoluteUrl(path);
  const image = absoluteUrl(article.image.src);
  const more = sortedJournalArticles()
    .filter((a) => a.slug !== article.slug)
    .slice(0, 2);
  const crumbs = [
    { name: "SAMECOR", path: "/" },
    { name: "Journal", path: "/journal" },
    { name: article.title, path },
  ];

  return (
    <main id="main-content" className={cn("min-h-screen bg-background text-foreground", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title={article.title}
        description={article.description}
        path={path}
        image={image}
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            alternativeHeadline: article.titleEn,
            description: article.description,
            image: [image],
            datePublished: article.datePublished,
            dateModified: article.dateModified,
            inLanguage: "th",
            articleSection: cat.label,
            keywords: article.tags.join(", "),
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            author: { "@type": "Organization", name: "SAMECOR", url: absoluteUrl("/") },
            publisher: {
              "@type": "Organization",
              name: "SAMECOR",
              logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png") },
            },
          },
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <article className="mx-auto w-full max-w-3xl px-4 pb-10 pt-8 sm:px-6 lg:pt-12">
        <SeoBreadcrumb items={crumbs} className="mb-0" />

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="text-foreground">{cat.label}</span>
            <span aria-hidden> · </span>
            {article.readMinutes} min read
          </p>
          <p className="mt-3 text-lg tracking-tight text-muted-foreground sm:text-xl">{article.titleEn}</p>
          <h1 className="thai-display mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="thai-body mt-4 text-base text-muted-foreground">{article.description}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            {article.author} · <time dateTime={article.datePublished}>{formatJournalDate(article.datePublished)}</time>
          </p>
        </header>

        <figure className="mt-8">
          <img
            src={article.image.src}
            alt={article.image.alt}
            fetchPriority="high"
            className="aspect-[16/9] w-full rounded-lg object-cover"
          />
          <figcaption className="mt-2 text-xs text-muted-foreground">{article.image.credit}</figcaption>
        </figure>

        <div className="mt-6">
          {article.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap gap-2" aria-label="แท็ก">
          {article.tags.map((t) => (
            <li key={t} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {t}
            </li>
          ))}
        </ul>
      </article>

      {more.length > 0 ? (
        <section aria-label="บทความอื่น" className="mx-auto mt-6 w-full max-w-3xl px-4 sm:px-6">
          <h2 className="border-t border-border pt-8 text-2xl tracking-tight">More stories</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            {more.map((a) => (
              <JournalCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      ) : null}
      <Footer />
    </main>
  );
}

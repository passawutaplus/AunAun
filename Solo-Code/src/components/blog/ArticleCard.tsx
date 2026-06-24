import { Link } from "@tanstack/react-router";
import { CATEGORY_GRADIENT, CATEGORY_LABEL_TH, isValidCategory } from "@/lib/articleHelpers";

export interface ArticleCardData {
  slug: string;
  title: string;
  summary: string;
  category: string;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  published_at?: string | null;
}

export function ArticleCard({ a }: { a: ArticleCardData }) {
  const category = isValidCategory(a.category) ? a.category : "Management";
  const gradient = CATEGORY_GRADIENT[category];
  const labelTh = CATEGORY_LABEL_TH[category];

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: a.slug }}
      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5"
    >
      {/* Featured image / gradient placeholder */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {a.featured_image ? (
          <img
            src={a.featured_image}
            alt={a.featured_image_alt || a.title}
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}
            aria-hidden="true"
          >
            <span className="text-white/95 text-lg sm:text-xl font-bold tracking-tight text-center line-clamp-3 drop-shadow-sm">
              {a.title}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm">
          {labelTh}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-2 p-4">
        <h3 className="text-sm sm:text-base font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
          {a.title}
        </h3>
        {a.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.summary}</p>
        )}
        <div className="mt-auto pt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          {a.published_at && (
            <time dateTime={a.published_at}>
              {new Date(a.published_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          )}
          <span className="text-primary font-medium">อ่านต่อ →</span>
        </div>
      </div>
    </Link>
  );
}

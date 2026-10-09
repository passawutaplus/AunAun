import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  typeLabel?: string | null;
  typePrefix?: string;
  details?: string | null;
  links?: string[];
  attachments?: string[];
  /** Extra thumbs (collab attached works). */
  extraThumbs?: { id: string; title: string; cover: string; href?: string }[];
  onThumbClick?: (id: string) => void;
  clamp?: boolean;
  className?: string;
};

/** Structured brief from the hire / collab request popup. */
export default function InboxRequestBrief({
  typeLabel,
  typePrefix = "ประเภทงาน",
  details,
  links = [],
  attachments = [],
  extraThumbs = [],
  onThumbClick,
  clamp = true,
  className,
}: Props) {
  const hasType = !!typeLabel?.trim();
  const hasDetails = !!details?.trim();
  const hasLinks = links.length > 0;
  const thumbs = [
    ...attachments.map((url, i) => ({
      id: `att-${i}`,
      title: "ภาพแนบ",
      cover: url,
      href: url,
    })),
    ...extraThumbs,
  ];
  if (!hasType && !hasDetails && !hasLinks && !thumbs.length) return null;

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {hasType ? (
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">{typePrefix}: </span>
          {typeLabel}
        </p>
      ) : null}
      {hasDetails ? (
        <p
          className={cn(
            "text-sm text-foreground/90 whitespace-pre-wrap",
            clamp && "line-clamp-3",
          )}
        >
          {details}
        </p>
      ) : null}
      {hasLinks ? (
        <div className="flex flex-wrap gap-1.5">
          {links.map((url, i) => (
            <a
              key={`${url}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 max-w-full text-[11px] px-2 py-1 rounded-full border border-border/70 bg-card hover:border-primary/40 text-foreground"
            >
              <Link2 className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
            </a>
          ))}
        </div>
      ) : null}
      {thumbs.length ? (
        <div className="flex gap-2 flex-wrap">
          {thumbs.map((thumb) => {
            const img = (
              <img loading="lazy" decoding="async"
                src={thumb.cover}
                alt=""
                className="w-14 h-14 rounded-lg object-cover border border-border/70"
              />
            );
            if (onThumbClick) {
              return (
                <button
                  key={thumb.id}
                  type="button"
                  title={thumb.title}
                  onClick={() => onThumbClick(thumb.id)}
                  className="shrink-0"
                >
                  {thumb.cover ? img : (
                    <span className="w-14 h-14 rounded-lg border border-border/70 bg-muted text-[9px] flex items-center justify-center text-muted-foreground p-1 text-center">
                      {thumb.title}
                    </span>
                  )}
                </button>
              );
            }
            return thumb.href ? (
              <a key={thumb.id} href={thumb.href} target="_blank" rel="noopener noreferrer" title={thumb.title}>
                {img}
              </a>
            ) : (
              <span key={thumb.id}>{img}</span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

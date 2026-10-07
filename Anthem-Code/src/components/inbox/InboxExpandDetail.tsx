import type { ReactNode } from "react";
import { FileText, Link2, type LucideIcon } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

const EMPTY = "-";

export function ExpandField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}) {
  const empty =
    children == null ||
    children === false ||
    (typeof children === "string" && !children.trim()) ||
    children === EMPTY;

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </p>
      <div
        className={cn(
          "text-sm leading-relaxed text-foreground",
          empty && "text-muted-foreground",
        )}
      >
        {empty ? EMPTY : children}
      </div>
    </div>
  );
}

export function ExpandLinkList({ urls }: { urls: string[] }) {
  const safe = urls.map((url) => safeHttpUrl(url)).filter((url): url is string => !!url);
  if (!safe.length) return <>{EMPTY}</>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {safe.map((url, i) => (
        <a
          key={`${url}-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-1 text-[11px] text-foreground hover:border-primary/40"
        >
          <Link2 className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        </a>
      ))}
    </div>
  );
}

export function ExpandAttachments({
  urls,
  onPreview,
}: {
  urls: string[];
  onPreview?: (index: number, urls: string[]) => void;
}) {
  const safe = urls.map((url) => safeHttpUrl(url)).filter((url): url is string => !!url);
  if (!safe.length) return <>{EMPTY}</>;
  return (
    <div className="flex flex-wrap gap-2">
      {safe.map((url, i) =>
        onPreview ? (
          <button
            key={url}
            type="button"
            title="ดูภาพอ้างอิง"
            onClick={() => onPreview(i, safe)}
            className="shrink-0"
          >
            <img loading="lazy" decoding="async"
              src={url}
              alt=""
              className="h-16 w-16 rounded-lg border border-border/70 object-cover"
            />
          </button>
        ) : (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="ภาพอ้างอิง">
            <img loading="lazy" decoding="async"
              src={url}
              alt=""
              className="h-16 w-16 rounded-lg border border-border/70 object-cover"
            />
          </a>
        ),
      )}
    </div>
  );
}

export function ExpandDocChips({
  chips,
  onOpen,
}: {
  chips: { key: string; kindLabel: string; number: string }[];
  onOpen?: () => void;
}) {
  if (!chips.length) return <>{EMPTY}</>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={onOpen}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-background px-1.5 py-0.5 text-left hover:border-primary/40"
        >
          <FileText className="h-3 w-3 shrink-0 text-primary" />
          <span className="text-[10px] font-semibold text-primary">{chip.kindLabel}</span>
          <span className="truncate font-mono text-[10px] tabular-nums">{chip.number}</span>
        </button>
      ))}
    </div>
  );
}

type Props = {
  /** Top-left, e.g. customer / sender card. */
  lead?: ReactNode;
  /** Top-right, e.g. referenced work. */
  reference?: ReactNode;
  brief: ReactNode;
  meta: ReactNode;
  notes?: ReactNode;
  extras?: ReactNode;
  actions?: ReactNode;
};

/** Two-column expand body for hire/collab inbox rows. */
export function InboxExpandDetail({ lead, reference, brief, meta, notes, extras, actions }: Props) {
  return (
    <div className="space-y-4">
      {lead || reference ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-12 md:items-start md:gap-8">
          <div className={cn("min-w-0", reference ? "md:col-span-7" : "md:col-span-12")}>{lead}</div>
          {reference ? (
            <div className="min-w-0 md:col-span-5 md:border-l md:border-border/60 md:pl-8">{reference}</div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-12 md:gap-8">
        <div className="space-y-4 md:col-span-7">{brief}</div>
        <div className="space-y-4 border-t border-border/60 pt-4 md:col-span-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          {meta}
        </div>
      </div>

      {notes ? <div className="space-y-2">{notes}</div> : null}
      {extras}

      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

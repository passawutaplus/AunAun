import { Link } from "react-router-dom";
import { Layers3, Lock, Share2 } from "lucide-react";
import SharePopover from "@/components/SharePopover";
import { cn } from "@/lib/utils";
import type { CollectionWithCovers } from "@/hooks/useCollections";

interface Props {
  collection: CollectionWithCovers;
  to?: string;
  className?: string;
  /** กริด 2 คอลัมน์บนมือถือ — ตัวอักษรกะทัดรัด */
  compact?: boolean;
  /** แถวแนวนอนสำหรับโหมดรายการ */
  list?: boolean;
  /** Workspace select instead of navigating to public detail */
  onSelect?: (collection: CollectionWithCovers) => void;
}

/** Fills the whole frame for 1–4 covers (no empty quadrants). */
function CoverMosaic({ covers, gap, zoom = false }: { covers: string[]; gap: string; zoom?: boolean }) {
  const shown = covers.slice(0, 4);
  const layout =
    shown.length === 1 ? "grid-cols-1" : shown.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2";
  return (
    <div className={cn("grid absolute inset-0", layout, gap)}>
      {shown.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className={cn(
            "w-full h-full object-cover",
            shown.length === 3 && i === 0 && "row-span-2",
            zoom && "transition-transform duration-500 group-hover:scale-[1.04]",
          )}
          loading="lazy"
        />
      ))}
    </div>
  );
}

const CollectionCard = ({
  collection,
  to,
  className,
  compact = false,
  list = false,
  onSelect,
}: Props) => {
  const href = to ?? `/collections/${collection.id}`;
  const covers = collection.covers ?? [];

  const shellClass = cn(
    list
      ? "group flex items-center gap-3 rounded-[8px] glass-panel px-3 py-2.5 hover:shadow-md transition-all text-left w-full"
      : "group block rounded-[8px] overflow-hidden glass-panel hover:shadow-lg transition-all text-left w-full",
    className,
  );

  const body = list ? (
    <>
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {covers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <Layers3 className="w-5 h-5" strokeWidth={2.25} />
          </div>
        ) : (
          <CoverMosaic covers={covers} gap="gap-px" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm text-foreground line-clamp-1 flex items-center gap-1.5">
          {collection.name}
          {!collection.is_public && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {collection.item_count} ผลงาน
        </p>
      </div>
    </>
  ) : (
    <>
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {covers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <Layers3 className="w-10 h-10" strokeWidth={2.25} />
          </div>
        ) : (
          <CoverMosaic covers={covers} gap="gap-0.5" zoom />
        )}
        {!collection.is_public && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md text-foreground/80">
            <Lock className="w-3 h-3" /> ส่วนตัว
          </span>
        )}
      </div>
      <div className={cn("px-2 py-2 sm:px-3 sm:py-2.5", !compact && "sm:py-2.5")}>
        <h3
          className={cn(
            "font-medium text-foreground thai-body leading-snug",
            compact ? "text-xs sm:text-sm line-clamp-2" : "text-sm font-semibold line-clamp-1",
          )}
        >
          {collection.name}
        </h3>
        <div
          className={cn(
            "flex items-center justify-between text-muted-foreground mt-0.5",
            compact ? "text-[10px] sm:text-[11px]" : "text-[11px]",
          )}
        >
          <span>{collection.item_count} ผลงาน</span>
        </div>
      </div>
    </>
  );

  const main = onSelect ? (
    <button type="button" onClick={() => onSelect(collection)} className={shellClass}>
      {body}
    </button>
  ) : (
    <Link to={href} className={shellClass}>
      {body}
    </Link>
  );

  // Only public collections have a link worth sharing. The button sits beside the link, not inside it.
  if (!collection.is_public) return main;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/collections/${collection.id}`;
  return (
    <div className="relative">
      {main}
      <div className={cn("absolute z-10", list ? "right-3 top-1/2 -translate-y-1/2" : "right-2 top-2")}>
        <SharePopover url={shareUrl} title={collection.name} label="แชร์คอลเลกชัน">
          <button
            type="button"
            aria-label={`แชร์คอลเลกชัน ${collection.name}`}
            title="แชร์"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
        </SharePopover>
      </div>
    </div>
  );
};

export default CollectionCard;

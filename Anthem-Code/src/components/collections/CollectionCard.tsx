import { Link } from "react-router-dom";
import { Layers3, Lock } from "lucide-react";
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
  const placeholders = Array.from({ length: 4 - covers.length });

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
          <div className="grid grid-cols-2 grid-rows-2 gap-px absolute inset-0">
            {covers.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm text-foreground line-clamp-1 flex items-center gap-1.5">
          {collection.name}
          {!collection.is_public && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {collection.item_count} ผลงาน
          {collection.category ? ` · ${collection.category}` : ""}
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
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 absolute inset-0">
            {covers.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ))}
            {placeholders.map((_, i) => (
              <div key={`p-${i}`} className="bg-muted" />
            ))}
          </div>
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
          {collection.category && <span className="truncate ml-2">{collection.category}</span>}
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(collection)} className={shellClass}>
        {body}
      </button>
    );
  }

  return (
    <Link to={href} className={shellClass}>
      {body}
    </Link>
  );
};

export default CollectionCard;

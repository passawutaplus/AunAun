import { Link } from "react-router-dom";
import { Layers3, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionWithCovers } from "@/hooks/useCollections";

interface Props {
  collection: CollectionWithCovers;
  to?: string;
  className?: string;
}

const CollectionCard = ({ collection, to, className }: Props) => {
  const href = to ?? `/collections/${collection.id}`;
  const covers = collection.covers ?? [];
  const placeholders = Array.from({ length: 4 - covers.length });

  return (
    <Link
      to={href}
      className={cn(
        "group block rounded-xl overflow-hidden glass-panel hover:shadow-lg transition-all",
        className,
      )}
    >
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
      <div className="px-3 py-2.5">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{collection.name}</h3>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
          <span>{collection.item_count} ผลงาน</span>
          {collection.category && <span className="truncate ml-2">{collection.category}</span>}
        </div>
      </div>
    </Link>
  );
};

export default CollectionCard;

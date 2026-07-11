import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InspireBoardWithCovers } from "@/hooks/useInspire";

type Props = {
  board: InspireBoardWithCovers;
  className?: string;
  compact?: boolean;
  list?: boolean;
  onSelect?: (board: InspireBoardWithCovers) => void;
};

const InspireBoardCard = ({ board, className, compact = false, list = false, onSelect }: Props) => {
  const covers = board.covers ?? [];
  const placeholders = Array.from({ length: Math.max(0, 4 - covers.length) });

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
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </div>
        ) : covers.length === 1 ? (
          <img src={covers[0]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-px absolute inset-0">
            {covers.slice(0, 4).map((url, i) => (
              <img key={`${board.id}-list-${i}`} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground line-clamp-1">{board.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {board.item_count} ภาพ · ส่วนตัว
        </p>
      </div>
    </>
  ) : (
    <>
      <div
        className={cn(
          "relative bg-muted overflow-hidden",
          compact ? "aspect-square" : "aspect-[4/3]",
        )}
      >
        {covers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <Sparkles className={cn(compact ? "w-6 h-6" : "w-8 h-8")} strokeWidth={2} />
          </div>
        ) : covers.length === 1 ? (
          <img
            src={covers[0]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 absolute inset-0">
            {covers.slice(0, 4).map((url, i) => (
              <img
                key={`${board.id}-${i}`}
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
      </div>
      <div className={cn("px-2 py-2", compact ? "sm:px-2" : "sm:px-3 sm:py-2.5")}>
        <p
          className={cn(
            "font-medium text-foreground line-clamp-1",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {board.name}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {board.item_count} ภาพ · ส่วนตัว
        </p>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(board)} className={shellClass}>
        {body}
      </button>
    );
  }

  return (
    <Link to={`/inspire/${board.id}`} className={shellClass}>
      {body}
    </Link>
  );
};

export default InspireBoardCard;

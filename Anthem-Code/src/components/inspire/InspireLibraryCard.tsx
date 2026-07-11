import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImagePalette } from "@/hooks/useImagePalette";
import { writeInspireItemDrag } from "@/lib/inspireDnD";
import { isInspireItemPinned, type InspireRecentItem } from "@/hooks/useInspire";

type Props = {
  item: InspireRecentItem;
  onOpen: () => void;
  selected?: boolean;
  /** Grid pin card vs Details list row. */
  variant?: "grid" | "list";
  /** Allow drag onto board chips (library home). */
  draggable?: boolean;
  onTogglePin?: (item: InspireRecentItem) => void;
  className?: string;
};

/** Vary masonry height from id so the library feels less uniform. */
function aspectForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  const variants = ["aspect-square", "aspect-[4/5]", "aspect-[5/4]", "aspect-[3/4]"];
  return variants[hash % variants.length]!;
}

function ColorStack({
  itemId,
  colors,
}: {
  itemId: string;
  colors: string[];
}) {
  return (
    <div className="flex shrink-0 items-center gap-1" aria-hidden>
      {colors.map((c, i) => (
        <span
          key={`${itemId}-swatch-${i}`}
          className="h-3 w-3 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

export function InspireLibraryCard({
  item,
  onOpen,
  selected,
  variant = "grid",
  draggable = false,
  onTogglePin,
  className,
}: Props) {
  const colors = useImagePalette(item.image_url, 6);
  const title = item.board_name?.trim() || "ภาพอ้างอิง";
  const pinned = isInspireItemPinned(item);

  const onDragStart = (e: React.DragEvent) => {
    if (!draggable) return;
    writeInspireItemDrag(e.dataTransfer, {
      imageUrl: item.image_url,
      projectId: item.project_id,
    });
    e.dataTransfer.effectAllowed = "copy";
  };

  const pinButton = onTogglePin ? (
    <button
      type="button"
      title={pinned ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
      aria-label={pinned ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
      aria-pressed={pinned}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onTogglePin(item);
      }}
      className={cn(
        "rounded-full p-1.5 shadow-sm transition",
        pinned
          ? "bg-primary text-primary-foreground"
          : "bg-background/90 text-foreground opacity-0 group-hover:opacity-100 hover:bg-background",
      )}
    >
      <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
    </button>
  ) : null;

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={selected}
        draggable={draggable}
        onDragStart={onDragStart}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors",
          "hover:bg-muted/40",
          selected && "bg-primary/10 ring-1 ring-primary/40",
          pinned && "bg-primary/5",
          draggable && "cursor-grab active:cursor-grabbing",
          className,
        )}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            src={item.image_url}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </p>
        {pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary fill-primary" /> : null}
        <ColorStack itemId={item.id} colors={colors} />
        {pinButton}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "group mb-4 w-full break-inside-avoid text-left",
        "transition-transform duration-300 hover:-translate-y-0.5",
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-muted",
          aspectForId(item.id),
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          pinned && "ring-2 ring-primary/50",
        )}
      >
        <img
          src={item.image_url}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {pinButton ? (
          <div className="absolute right-2 top-2 z-10">{pinButton}</div>
        ) : pinned ? (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm">
            <Pin className="h-3.5 w-3.5 fill-current" />
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </p>
        <ColorStack itemId={item.id} colors={colors} />
      </div>
    </button>
  );
}

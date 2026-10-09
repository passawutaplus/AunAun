import { type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useObjectHearts, writeObjectHeart } from "@/hooks/useObjectHearts";
import {
  formatEditionQuantity,
  formatBaht,
  shopSaleLabel,
  type CreatorObject,
} from "@/lib/objects/taxonomy";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  paper: "bg-[#e7e2d8]",
  wood: "bg-[#d9c7ad]",
  metal: "bg-[#d5d8dc]",
  ceramic: "bg-[#e6d5c8]",
  glass: "bg-[#d5e4e6]",
  textile: "bg-[#ddd4cf]",
  mixed: "bg-[#e4e1db]",
  pdf: "bg-[#efe8dc]",
  figma: "bg-[#e6e3f2]",
  "print-ready": "bg-[#e5eee4]",
  "3d": "bg-[#e3e6ef]",
  pack: "bg-[#eee8e2]",
};

export function ObjectStage({ item, className }: { item: CreatorObject; className?: string }) {
  const tone = TONE[item.material] ?? "bg-[#eceae6]";
  const accent = item.finishes[0]?.hex ?? "#c8c4bc";
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-[#f3f3f1]", className)}>
      {item.cover_url ? (
        <img src={item.cover_url} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={cn("flex h-[58%] w-[58%] items-center justify-center rounded-full", tone)} aria-hidden>
          <span className="h-10 w-10 rounded-sm" style={{ backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}

function ObjectHeart({ id }: { id: string }) {
  const { user } = useAuth();
  const on = useObjectHearts().has(id);
  const toggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    writeObjectHeart(user?.id ?? null, id, !on);
  };

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "เลิกถูกใจ" : "ถูกใจ"}
      onClick={toggle}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Heart className={cn("h-4 w-4", on && "fill-current")} strokeWidth={on ? 0 : 2} aria-hidden />
    </button>
  );
}

export default function ObjectCard({ item }: { item: CreatorObject }) {
  const navigate = useNavigate();
  const open = () => navigate(`/object/${item.id}`);
  const second = item.gallery_urls.map((url) => url.trim()).find(Boolean) ?? "";
  const edition = formatEditionQuantity(item.edition, item.edition_label);
  const tag = shopSaleLabel(item.fulfillment);

  return (
    <article className="min-w-0">
      <button
        type="button"
        onClick={open}
        className="group relative block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ObjectStage
          item={item}
          className={cn(
            "aspect-[4/5] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            second && "group-hover:-translate-x-full",
          )}
        />
        {second ? (
          <img
            src={second}
            alt=""
            className="absolute inset-0 h-full w-full translate-x-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 motion-reduce:transition-none"
          />
        ) : null}
      </button>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-0.5 pt-2">
        <button type="button" onClick={open} className="min-w-0 text-left">
          <p className="truncate text-sm font-medium leading-8 text-foreground">{item.title}</p>
        </button>
        <div className="flex items-center justify-end gap-1">
          {tag ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] leading-4 text-muted-foreground">
              {tag}
            </span>
          ) : null}
          <ObjectHeart id={item.id} />
        </div>
        {edition ? (
          <p className="truncate text-xs leading-5 text-muted-foreground">{edition}</p>
        ) : (
          <span />
        )}
        <p className="justify-self-end text-sm tabular-nums leading-5 text-foreground">{formatBaht(item.price_thb)}</p>
      </div>
    </article>
  );
}

import * as React from "react";
import { Compass, Sparkles, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES, RESOURCES, type CategoryMeta } from "./resources";
import { CategoryDivider, InspireResourceCard } from "./InspireResourceCard";

type Props = {
  /** จำนวนรายการเมื่อยังไม่ขยาย (ใช้ในหน้า Home) */
  previewLimit?: number;
};

export function InspireSection({ previewLimit }: Props) {
  const isPreview = previewLimit != null;
  const [expanded, setExpanded] = React.useState(!isPreview);
  const [active, setActive] = React.useState<CategoryMeta["id"]>("all");

  const filtered = active === "all" ? RESOURCES : RESOURCES.filter((r) => r.category === active);

  const visibleItems = isPreview && !expanded ? filtered.slice(0, previewLimit) : filtered;

  const grouped = React.useMemo(() => {
    if (active !== "all" || (isPreview && !expanded)) return null;
    return CATEGORIES.filter((c) => c.id !== "all").map((cat) => ({
      cat,
      items: RESOURCES.filter((r) => r.category === cat.id),
    }));
  }, [active, isPreview, expanded]);

  return (
    <div className="space-y-4">
      {!isPreview && (
        <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-soft">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-[#FF5F05]/30 to-[#FF9F67]/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF5F05] to-[#FF9F67] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] shadow-soft">
                <Compass className="h-3 w-3" /> So1o · Inspire
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                แหล่งบ่มเพาะไอเดีย
                <br />
                <span className="text-muted-foreground font-semibold">ของฟรีแลนซ์ครีเอทีฟ</span>
              </h1>
            </div>
            <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {RESOURCES.length} sources
            </Badge>
          </div>
        </header>
      )}

      {(!isPreview || expanded) && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = active === cat.id;
            const count =
              cat.id === "all"
                ? RESOURCES.length
                : RESOURCES.filter((r) => r.category === cat.id).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActive(cat.id)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#FF5F05] to-[#FF9F67] text-white border-transparent shadow-soft"
                    : "bg-card text-foreground border-border hover:border-[#FF5F05]/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                    isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {grouped ? (
        <div className="space-y-8">
          {grouped.map(({ cat, items }) => (
            <section key={cat.id} className="space-y-4">
              <CategoryDivider cat={cat} count={items.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((r) => (
                  <InspireResourceCard key={r.name} resource={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((r) => (
            <InspireResourceCard key={r.name} resource={r} />
          ))}
        </div>
      )}

      {isPreview && !expanded && filtered.length > previewLimit! && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExpanded(true)}>
            ดู Inspire ทั้งหมด ({RESOURCES.length})
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

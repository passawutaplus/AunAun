import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_PARENTS,
  getCategoryParent,
  parentSubsWithOther,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import { cn } from "@/lib/utils";

type Props = {
  parentId: CategoryParentId | null;
  subId: string | null;
  onChange: (next: { parentId: CategoryParentId | null; subId: string | null }) => void;
  disabled?: boolean;
  invalid?: boolean;
};

function formatSelection(parentId: CategoryParentId | null, subId: string | null): string {
  const parent = parentId ? getCategoryParent(parentId) : null;
  if (!parent) return "";
  const subLabel = parentSubsWithOther(parent).find((s) => s.id === subId)?.label;
  return subLabel ? `${parent.label} > ${subLabel}` : parent.label;
}

export function ProjectTaxonomyPicker({
  parentId,
  subId,
  onChange,
  disabled,
  invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftParentId, setDraftParentId] = useState<CategoryParentId | null>(parentId);
  const [draftSubId, setDraftSubId] = useState<string | null>(subId);
  const [browseParentId, setBrowseParentId] = useState<CategoryParentId | null>(parentId);

  const syncDraftFromValue = () => {
    setDraftParentId(parentId);
    setDraftSubId(subId);
    setBrowseParentId(parentId ?? CATEGORY_PARENTS[0]?.id ?? null);
    setQuery("");
  };

  useEffect(() => {
    if (open) syncDraftFromValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when panel opens
  }, [open]);

  const browseParent = browseParentId ? getCategoryParent(browseParentId) : null;
  const browseSubs = parentSubsWithOther(browseParent);

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_PARENTS;
    return CATEGORY_PARENTS.filter((p) => {
      if (p.label.toLowerCase().includes(q) || p.id.includes(q)) return true;
      return parentSubsWithOther(p).some(
        (s) => s.label.toLowerCase().includes(q) || s.id.includes(q),
      );
    });
  }, [query]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || filteredParents.length === 0) return;
    if (browseParentId && filteredParents.some((p) => p.id === browseParentId)) return;
    setBrowseParentId(filteredParents[0].id);
  }, [query, filteredParents, browseParentId]);

  const filteredSubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return browseSubs;
    const parentHit =
      browseParent &&
      (browseParent.label.toLowerCase().includes(q) || browseParent.id.includes(q));
    if (parentHit) return browseSubs;
    return browseSubs.filter((s) => s.label.toLowerCase().includes(q) || s.id.includes(q));
  }, [browseSubs, browseParent, query]);

  const displayValue = formatSelection(parentId, subId);
  const draftPreview = formatSelection(draftParentId, draftSubId);
  const hasDraft = Boolean(draftParentId || draftSubId);
  const dirty =
    draftParentId !== parentId || draftSubId !== subId;

  const selectParent = (id: CategoryParentId) => {
    setBrowseParentId(id);
    setDraftParentId(id);
    setDraftSubId(null);
  };

  const selectSub = (parent: CategoryParentId, nextSub: string | null) => {
    setDraftParentId(parent);
    setDraftSubId(nextSub);
  };

  const clearDraft = () => {
    setDraftParentId(null);
    setDraftSubId(null);
  };

  const confirm = () => {
    onChange({ parentId: draftParentId, subId: draftSubId });
    setOpen(false);
    setQuery("");
  };

  const closeWithoutSave = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase">
        หมวดงาน <span className="text-primary">*</span>
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next) closeWithoutSave();
          else setOpen(true);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              invalid && "border-destructive focus:ring-destructive/40",
            )}
          >
            <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
              {displayValue || "เลือกหมวดใหญ่ > หมวดย่อย"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,32rem)] sm:w-[34rem] p-0 overflow-hidden"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาหมวดใหญ่หรือหมวดย่อย..."
                className="h-9 pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border/60 h-[min(60vh,24rem)]">
            <div className="overflow-y-auto overscroll-contain p-1">
              <p className="sticky top-0 z-[1] bg-popover px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                หมวดใหญ่
              </p>
              {filteredParents.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">ไม่พบหมวด</p>
              ) : (
                filteredParents.map((p) => {
                  const browsing = p.id === browseParentId;
                  const drafted = p.id === draftParentId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseEnter={() => setBrowseParentId(p.id)}
                      onFocus={() => setBrowseParentId(p.id)}
                      onClick={() => selectParent(p.id)}
                      className={cn(
                        "flex w-full items-center gap-1 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        browsing ? "bg-muted text-foreground" : "hover:bg-muted/60",
                        drafted && "font-medium text-primary",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain bg-muted/20 p-1">
              <p className="sticky top-0 z-[1] bg-muted/95 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                หมวดย่อย
              </p>
              {!browseParent ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">เลือกหมวดใหญ่ทางซ้าย</p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => selectSub(browseParent.id, null)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      draftParentId === browseParent.id && !draftSubId
                        ? "bg-primary/10 font-medium text-primary"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">ทั้งหมวดใหญ่</span>
                    {draftParentId === browseParent.id && !draftSubId ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
                  </button>
                  {filteredSubs.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">ไม่พบหมวดย่อย</p>
                  ) : (
                    filteredSubs.map((s) => {
                      const selected = draftParentId === browseParent.id && draftSubId === s.id;
                      const isOther = s.id === `${browseParent.id}-other`;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectSub(browseParent.id, s.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            selected
                              ? "bg-primary/10 font-medium text-primary"
                              : "hover:bg-muted/70",
                            isOther && "mt-0.5 border-t border-border/50",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{s.label}</span>
                          {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                        </button>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border/60 bg-background/80 p-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={clearDraft}
              disabled={!hasDraft}
            >
              ล้าง
            </Button>
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {draftPreview || "ยังไม่ได้เลือก"}
            </p>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-full bg-gradient-brand px-4 text-white hover:opacity-90"
              onClick={confirm}
              disabled={!draftParentId && !dirty}
            >
              ยืนยัน
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ProjectTaxonomyPicker;

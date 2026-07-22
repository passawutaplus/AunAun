import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_PARENTS,
  getCategoryParent,
  parentSubsWithOther,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import type { ProjectCategory } from "@/data/projectTypes";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type ProjectSearchFilterValue = {
  search: string;
  parentId: CategoryParentId | "All";
  /** @deprecated leaf chips removed — kept for apply compatibility */
  leaves: ProjectCategory[];
  /** Selected subcategory ids under the parent */
  styles: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ProjectSearchFilterValue;
  onApply: (next: ProjectSearchFilterValue) => void;
  resultCount?: number;
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs border transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
      )}
    >
      {label}
    </button>
  );
}

function FilterBody({
  draft,
  setDraft,
  onApply,
  onClose,
  resultCount,
  autoFocusSearch,
}: {
  draft: ProjectSearchFilterValue;
  setDraft: Dispatch<SetStateAction<ProjectSearchFilterValue>>;
  onApply: () => void;
  onClose: () => void;
  resultCount?: number;
  autoFocusSearch?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const parent = draft.parentId === "All" ? null : getCategoryParent(draft.parentId);
  const subs = parentSubsWithOther(parent);
  const hasParent = draft.parentId !== "All";

  useEffect(() => {
    if (!autoFocusSearch) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [autoFocusSearch]);

  const toggleSub = (id: string) => {
    setDraft((prev) => {
      const has = prev.styles.includes(id);
      return {
        ...prev,
        styles: has ? prev.styles.filter((s) => s !== id) : [...prev.styles, id],
      };
    });
  };

  const selectParent = (id: CategoryParentId | "All") => {
    setDraft((prev) => ({
      ...prev,
      parentId: id,
      leaves: [],
      styles: [],
    }));
  };

  const clearAll = () => {
    setDraft({ search: "", parentId: "All", leaves: [], styles: [] });
  };

  const activeExtra = draft.styles.length + (draft.search.trim() ? 1 : 0);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={draft.search}
          onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply();
          }}
          placeholder="ค้นหาชื่อผลงาน เครื่องมือ สไตล์…"
          className="w-full rounded-2xl bg-secondary border border-border pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {draft.search ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-background/80"
            aria-label="ล้างคำค้น"
            onClick={() => setDraft((p) => ({ ...p, search: "" }))}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-4 space-y-5 pb-2">
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">หมวดใหญ่</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip label="All" active={draft.parentId === "All"} onClick={() => selectParent("All")} />
            {CATEGORY_PARENTS.map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                active={draft.parentId === p.id}
                onClick={() => selectParent(p.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">หมวดย่อย</p>
          {hasParent && subs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {subs.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={draft.styles.includes(s.id)}
                  onClick={() => toggleSub(s.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/80 min-h-[2rem] flex items-center">
              {hasParent
                ? "หมวดนี้ยังไม่มีหมวดย่อย"
                : "เลือกหมวดใหญ่ก่อน เพื่อดูหมวดย่อย"}
            </p>
          )}
        </section>
      </div>

      <div className="shrink-0 pt-3 mt-auto border-t border-border/60 flex items-center gap-2">
        {activeExtra > 0 || draft.parentId !== "All" ? (
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={clearAll}>
            ล้างทั้งหมด
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onClose}>
            ปิด
          </Button>
        )}
        <Button
          type="button"
          className="flex-1 rounded-full bg-gradient-brand text-white hover:opacity-90"
          onClick={onApply}
        >
          {typeof resultCount === "number" ? `ดูผลงาน (${resultCount})` : "ดูผลงาน"}
        </Button>
      </div>
    </div>
  );
}

const ProjectSearchFilterSheet = ({
  open,
  onOpenChange,
  value,
  onApply,
  resultCount,
}: Props) => {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft({ ...value, styles: value.styles ?? [] });
  }, [open, value]);

  const apply = () => {
    onApply({ ...draft, leaves: [] });
    onOpenChange(false);
  };

  const title = "ค้นหาและกรองผลงาน";
  const description = "หมวดใหญ่บนฟีด · เลือกรายละเอียด design & art ที่นี่";

  const titleRow = (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </span>
      <span>{title}</span>
    </span>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] rounded-t-2xl p-4 flex flex-col gap-0"
        >
          <SheetHeader className="text-left pb-3 shrink-0">
            <SheetTitle className="text-base">{titleRow}</SheetTitle>
            <SheetDescription className="text-xs pl-10">{description}</SheetDescription>
          </SheetHeader>
          <FilterBody
            draft={draft}
            setDraft={setDraft}
            onApply={apply}
            onClose={() => onOpenChange(false)}
            resultCount={resultCount}
            autoFocusSearch
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-5 sm:rounded-2xl">
        <DialogHeader className="pb-3 shrink-0">
          <DialogTitle className="text-base">{titleRow}</DialogTitle>
          <DialogDescription className="text-xs pl-10">{description}</DialogDescription>
        </DialogHeader>
        <FilterBody
          draft={draft}
          setDraft={setDraft}
          onApply={apply}
          onClose={() => onOpenChange(false)}
          resultCount={resultCount}
          autoFocusSearch
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSearchFilterSheet;

export function countActiveProjectFilters(value: ProjectSearchFilterValue): number {
  return (
    (value.parentId !== "All" ? 1 : 0) +
    value.styles.length +
    (value.search.trim() ? 1 : 0)
  );
}

export function useParentChipOptions(includeDrill: boolean) {
  return useMemo(() => {
    const parents = CATEGORY_PARENTS.map((p) => ({ id: p.id as string, label: p.label }));
    const all = [{ id: "All", label: "All" }, ...parents];
    if (!includeDrill) return all;
    return [{ id: "Design Drill", label: "Design Drill" }, ...all];
  }, [includeDrill]);
}

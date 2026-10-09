import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CATEGORY_PARENTS,
  getCategoryParent,
  parentSubsWithOther,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import type { ProjectCategory } from "@/data/projectTypes";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HideAiToggle } from "@/components/icons/NoAiIcon";

export type ProjectSearchFilterValue = {
  search: string;
  parentId: CategoryParentId | "All";
  /** @deprecated leaf chips removed — kept for apply compatibility */
  leaves: ProjectCategory[];
  /** Selected subcategory ids under the parent */
  styles: string[];
  /** When true, hide projects marked as AI-assisted */
  hideAi: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ProjectSearchFilterValue;
  onApply: (next: ProjectSearchFilterValue) => void;
  /** Apply hide-AI immediately, without waiting for ดูผลงาน. */
  onHideAiChange?: (hide: boolean) => void;
  resultCount?: number;
  recentSearches?: string[];
  onRecentSelect?: (query: string) => void;
};

const PAPER = '"Iowan Old Style", Palatino, Georgia, serif';

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
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-[#2f2e2c] bg-[#2f2e2c] text-[#f5f5f5]"
          : "border-[#2f2e2c]/15 bg-white text-[#5c5954] hover:border-[#2f2e2c]/40 hover:text-[#2f2e2c]",
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
  recentSearches = [],
  onRecentSelect,
  onHideAiChange,
}: {
  draft: ProjectSearchFilterValue;
  setDraft: Dispatch<SetStateAction<ProjectSearchFilterValue>>;
  onApply: () => void;
  onClose: () => void;
  resultCount?: number;
  autoFocusSearch?: boolean;
  recentSearches?: string[];
  onRecentSelect?: (query: string) => void;
  onHideAiChange?: (hide: boolean) => void;
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
    setDraft({ search: "", parentId: "All", leaves: [], styles: [], hideAi: false });
    onHideAiChange?.(false);
  };

  const activeExtra = draft.styles.length + (draft.search.trim() ? 1 : 0) + (draft.hideAi ? 1 : 0);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6862]" />
        <input
          ref={inputRef}
          type="search"
          value={draft.search}
          onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply();
          }}
          placeholder="ค้นหาชื่อผลงาน เครื่องมือ สไตล์…"
          className="w-full rounded-full border border-[#2f2e2c]/12 bg-white py-3 pl-10 pr-10 text-sm text-[#2f2e2c] placeholder:text-xs placeholder:font-light placeholder:text-[#2f2e2c]/35 focus:outline-none focus:ring-2 focus:ring-[#2f2e2c]/15"
        />
        {draft.search ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#6b6862] hover:bg-[#2f2e2c]/8"
            aria-label="ล้างคำค้น"
            onClick={() => setDraft((p) => ({ ...p, search: "" }))}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {!draft.search.trim() && recentSearches.length > 0 ? (
        <div className="mt-3 shrink-0">
          <p className="mb-1.5 text-[11px] text-[#6b6862]">ค้นหาล่าสุด</p>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((q) => (
              <button
                key={q}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[#2f2e2c]/10 bg-white px-2.5 py-1 text-xs text-[#2f2e2c] hover:border-[#2f2e2c]/30"
                onClick={() => {
                  setDraft((p) => ({ ...p, search: q }));
                  onRecentSelect?.(q);
                }}
              >
                <Search className="h-3 w-3 text-[#6b6862]" aria-hidden />
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-4 space-y-5 pb-2">
        <section>
          <p className="mb-2 text-xs font-medium text-[#6b6862]">หมวดใหญ่</p>
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
          <p className="mb-2 text-xs font-medium text-[#6b6862]">หมวดย่อย</p>
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
            <p className="flex min-h-[2rem] items-center text-[11px] text-[#6b6862]/80">
              {hasParent
                ? "หมวดนี้ยังไม่มีหมวดย่อย"
                : "เลือกหมวดใหญ่ก่อน เพื่อดูหมวดย่อย"}
            </p>
          )}
        </section>
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-[#2f2e2c]/10 pt-3">
        {activeExtra > 0 || draft.parentId !== "All" ? (
          <button type="button" className="rounded-full px-3 py-2 text-sm text-[#5c5954] hover:text-[#2f2e2c]" onClick={clearAll}>
            ล้างทั้งหมด
          </button>
        ) : (
          <button type="button" className="rounded-full px-3 py-2 text-sm text-[#5c5954] hover:text-[#2f2e2c]" onClick={onClose}>
            ปิด
          </button>
        )}
        <button
          type="button"
          className="flex-1 rounded-full bg-[#2f2e2c] py-2.5 text-sm text-[#f5f5f5] hover:bg-[#1c1b19]"
          onClick={onApply}
        >
          {typeof resultCount === "number" ? `ดูผลงาน (${resultCount})` : "ดูผลงาน"}
        </button>
      </div>
    </div>
  );
}

const ProjectSearchFilterSheet = ({
  open,
  onOpenChange,
  value,
  onApply,
  onHideAiChange,
  resultCount,
  recentSearches = [],
  onRecentSelect,
}: Props) => {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) return;
    setDraft({ ...value, styles: value.styles ?? [], hideAi: value.hideAi ?? false });
    // Snapshot when opening — live hide-AI must not wipe other draft chips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = () => {
    onApply({ ...draft, leaves: [] });
    onOpenChange(false);
  };

  const title = "Search and filter projects";
  const paper =
    "border-[#e4e1db] bg-[#f5f5f5] text-[#2f2e2c] shadow-[0_28px_80px_-36px_rgba(47,46,44,0.55)] [&>button]:text-[#2f2e2c]";
  const toggleHideAi = () => {
    setDraft((p) => {
      const hideAi = !p.hideAi;
      onHideAiChange?.(hideAi);
      return { ...p, hideAi };
    });
  };

  const titleRow = (
    <span style={{ fontFamily: PAPER }} className="text-[1.65rem] font-medium leading-none tracking-tight text-[#2f2e2c]">
      {title}
    </span>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          overlayClassName="bg-[#2f2e2c]/40"
          aria-describedby={undefined}
          className={cn(paper, "flex h-[92dvh] flex-col gap-0 rounded-t-[1.75rem] border-0 p-4")}
        >
          <SheetHeader className="shrink-0 pb-3 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle className="text-base font-normal">{titleRow}</SheetTitle>
              </div>
              <HideAiToggle active={draft.hideAi} onToggle={toggleHideAi} className="mt-0.5 h-10 w-10 !text-[#2f2e2c] hover:!bg-[#2f2e2c]/8 [&_svg]:h-6 [&_svg]:w-6" />
            </div>
          </SheetHeader>
          <FilterBody
            draft={draft}
            setDraft={setDraft}
            onApply={apply}
            onClose={() => onOpenChange(false)}
            resultCount={resultCount}
            autoFocusSearch
            recentSearches={recentSearches}
            onRecentSelect={onRecentSelect}
            onHideAiChange={onHideAiChange}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-[#2f2e2c]/40"
        aria-describedby={undefined}
        className={cn(paper, "flex max-h-[85vh] flex-col gap-0 p-6 sm:max-w-lg sm:rounded-[1.75rem]")}
      >
        <DialogHeader className="shrink-0 pb-3 pr-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-normal">{titleRow}</DialogTitle>
            </div>
            <HideAiToggle active={draft.hideAi} onToggle={toggleHideAi} className="mt-0.5 h-10 w-10 !text-[#2f2e2c] hover:!bg-[#2f2e2c]/8 [&_svg]:h-6 [&_svg]:w-6" />
          </div>
        </DialogHeader>
        <FilterBody
          draft={draft}
          setDraft={setDraft}
          onApply={apply}
          onClose={() => onOpenChange(false)}
          resultCount={resultCount}
          autoFocusSearch
          recentSearches={recentSearches}
          onRecentSelect={onRecentSelect}
          onHideAiChange={onHideAiChange}
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
    (value.search.trim() ? 1 : 0) +
    (value.hideAi ? 1 : 0)
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

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyProjects, type DBProject } from "@/hooks/useProjects";
import { useAddProjectsToSeries, useProjectSeriesItems } from "@/hooks/useProjectSeries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seriesId: string;
  seriesTitle?: string;
  /** When set, cancel button uses this label (e.g. after create flow). */
  skipLabel?: string;
}

type CatalogAddSortMode = "newest" | "oldest" | "views" | "likes";

const SORT_OPTIONS: { value: CatalogAddSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "views", label: "วิวเยอะสุด" },
  { value: "likes", label: "ไลค์เยอะสุด" },
];

function projectTime(p: DBProject): number {
  const raw = p.published_at || p.created_at || p.updated_at || "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function sortCatalogCandidates(list: DBProject[], mode: CatalogAddSortMode): DBProject[] {
  const sorted = [...list];
  switch (mode) {
    case "oldest":
      return sorted.sort((a, b) => projectTime(a) - projectTime(b));
    case "views":
      return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case "likes":
      return sorted.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    case "newest":
    default:
      return sorted.sort((a, b) => projectTime(b) - projectTime(a));
  }
}

export function SeriesAddProjectsDialog({
  open,
  onOpenChange,
  seriesId,
  seriesTitle,
  skipLabel,
}: Props) {
  const { user } = useAuth();
  const { data: projects = [] } = useMyProjects(user?.id);
  const { data: existingItems = [] } = useProjectSeriesItems(open ? seriesId : undefined);
  const add = useAddProjectsToSeries();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<CatalogAddSortMode>("newest");

  const alreadyInSeries = useMemo(
    () => new Set(existingItems.map((i) => i.project_id)),
    [existingItems],
  );

  const published = useMemo(
    () => projects.filter((p) => p.status === "Published" && !alreadyInSeries.has(p.id)),
    [projects, alreadyInSeries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? published
      : published.filter((p) => {
          const hay = [p.title, p.category, ...(p.tags ?? [])].join(" ").toLowerCase();
          return hay.includes(q);
        });
    return sortCatalogCandidates(matched, sortMode);
  }, [published, search, sortMode]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetUi = () => {
    setSelected(new Set());
    setSearch("");
    setSortMode("newest");
  };

  const submit = async () => {
    const ids = [...selected];
    if (!ids.length) {
      toast.error("เลือกอย่างน้อย 1 ผลงาน");
      return;
    }
    try {
      await add.mutateAsync({ seriesId, projectIds: ids });
      toast.success(`เพิ่ม ${ids.length} ผลงานเข้า Catalog แล้ว`);
      resetUi();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetUi();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>เพิ่มผลงานเข้า Catalog</DialogTitle>
          {seriesTitle ? (
            <p className="text-xs text-muted-foreground">{seriesTitle}</p>
          ) : null}
        </DialogHeader>

        {published.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ หมวด หรือแท็ก…"
                className="h-9 rounded-full bg-muted/50 border-0 pl-9"
              />
            </div>
            <Select
              value={sortMode}
              onValueChange={(next) => setSortMode(next as CatalogAddSortMode)}
            >
              <SelectTrigger
                aria-label="เรียงผลงาน"
                className="h-9 w-[8.5rem] shrink-0 rounded-full text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 -mx-1 px-1">
          {published.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              ไม่มีผลงานที่เผยแพร่แล้วให้เพิ่ม
              <br />
              (ชิ้นที่อยู่ใน Catalog นี้อยู่แล้วจะไม่แสดง)
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              ไม่พบผลงานที่ตรงกับคำค้น
            </div>
          ) : (
            filtered.map((p) => {
              const active = selected.has(p.id);
              const thumb = p.cover_url || p.gallery_urls?.[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-secondary/40 hover:bg-accent",
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.category || "ผลงาน"}
                      <span className="tabular-nums">
                        {" "}
                        · ดู {(p.views ?? 0).toLocaleString()} · ถูกใจ {(p.likes ?? 0).toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center shrink-0",
                      active ? "bg-primary border-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {active ? <Check className="w-3.5 h-3.5" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {skipLabel ?? "ยกเลิก"}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={add.isPending || selected.size === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            เพิ่มเข้า Catalog ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

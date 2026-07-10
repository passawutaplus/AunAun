import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Images,
  Lock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  useProjectSeriesItems,
  type ProjectSeries,
} from "@/hooks/useProjectSeries";
import { readSeriesProjectDragId } from "@/lib/seriesDnD";
import type { DBProject } from "@/hooks/useProjects";

/** Sidebar selection: series folders list | all works | one series */
export type SeriesSidebarSelection = "folders" | "works" | string;

type Props = {
  series: ProjectSeries[];
  projects?: DBProject[];
  selection: SeriesSidebarSelection;
  onSelect: (selection: SeriesSidebarSelection) => void;
  onDropProject?: (seriesId: string, projectId: string) => void;
  worksCount?: number;
  className?: string;
};

function SeriesFolderRow({
  series,
  active,
  expanded,
  onToggleExpand,
  onSelect,
  onDropProject,
}: {
  series: ProjectSeries;
  active: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onDropProject?: (seriesId: string, projectId: string) => void;
}) {
  const { data: items = [], isFetching } = useProjectSeriesItems(expanded ? series.id : undefined);
  const count = series.item_count ?? 0;
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-0.5">
      <div
        onDragOver={(e) => {
          if (!onDropProject) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!onDropProject) return;
          e.preventDefault();
          setDragOver(false);
          const projectId = readSeriesProjectDragId(e.dataTransfer);
          if (projectId) onDropProject(series.id, projectId);
        }}
        className={cn(
          "flex w-full items-center gap-0.5 rounded-lg pr-1 transition-colors",
          active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/40",
          dragOver && "ring-2 ring-primary/50 bg-primary/15",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "หุบโฟลเดอร์" : "เปิดโฟลเดอร์"}
          aria-expanded={expanded}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
          />
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect();
            if (!expanded) onToggleExpand();
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1.5 text-left text-sm"
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 opacity-90" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 opacity-80" />
          )}
          <span className="min-w-0 flex-1 truncate">{series.title}</span>
          {!series.is_public && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="ส่วนตัว" />
          )}
          <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
        </button>
      </div>

      {expanded && (
        <ul className="ml-3 border-l border-border/50 pl-3 space-y-0.5 py-0.5">
          {isFetching && items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">กำลังโหลด…</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">
              ยังว่าง — ลากผลงานมาวางที่นี่
            </li>
          ) : (
            items.map((item) => {
              const p = item.project;
              if (!p) return null;
              const label = item.role_label || p.title;
              const thumb = p.cover_url || p.gallery_urls?.[0] || "";
              return (
                <li key={item.project_id}>
                  <Link
                    to={`/project/${p.id}`}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
                    title={label}
                  >
                    <span className="h-6 w-6 shrink-0 overflow-hidden rounded bg-muted">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export function SeriesWorkspaceSidebar({
  series,
  projects = [],
  selection,
  onSelect,
  onDropProject,
  worksCount = 0,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filteredSeries = useMemo(() => {
    if (!isSearching) return series;
    return series.filter((s) => {
      const hay = `${s.title} ${s.client_label ?? ""} ${s.summary ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [series, isSearching, q]);

  const filteredWorks = useMemo(() => {
    if (!isSearching) return [];
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, isSearching, q]);

  const totalItems = series.reduce((sum, s) => sum + (s.item_count ?? 0), 0);
  const selectedSeriesId =
    selection !== "folders" && selection !== "works" ? selection : null;
  const noSearchResults =
    isSearching && filteredSeries.length === 0 && filteredWorks.length === 0;

  useEffect(() => {
    if (!selectedSeriesId) return;
    setExpandedIds((prev) => {
      if (prev.has(selectedSeriesId)) return prev;
      const next = new Set(prev);
      next.add(selectedSeriesId);
      return next;
    });
  }, [selectedSeriesId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border/60 bg-transparent",
        className,
      )}
    >
      <div className="px-1 py-2 pr-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">ชุดผลงาน</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {series.length} ชุด · {totalItems} ชิ้น
          </p>
        </div>
      </div>

      <div className="pr-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชุดหรือผลงาน…"
            className="h-9 rounded-xl border-border/40 bg-transparent pl-8 text-sm"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-3 pb-3 space-y-0.5" aria-label="รายการชุดผลงาน">
        {!isSearching && (
          <>
            <button
              type="button"
              onClick={() => onSelect("works")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                selection === "works"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent/40",
              )}
            >
              <Images className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">งานทั้งหมด</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">{worksCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelect("folders")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                selection === "folders"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent/40",
              )}
            >
              <Folder className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">ชุดทั้งหมด</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">{series.length}</span>
            </button>

            <div className="my-2 border-t border-border/40" />
          </>
        )}

        {noSearchResults ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            ไม่พบชุดหรือผลงานที่ตรงกับคำค้น
          </p>
        ) : (
          <>
            {isSearching && filteredSeries.length > 0 && (
              <p className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                ชุด ({filteredSeries.length})
              </p>
            )}
            {filteredSeries.length === 0 && !isSearching ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                ยังไม่มีชุดผลงาน
              </p>
            ) : (
              filteredSeries.map((s) => (
                <SeriesFolderRow
                  key={s.id}
                  series={s}
                  active={selection === s.id}
                  expanded={expandedIds.has(s.id)}
                  onToggleExpand={() => toggleExpand(s.id)}
                  onSelect={() => onSelect(s.id)}
                  onDropProject={onDropProject}
                />
              ))
            )}

            {isSearching && filteredWorks.length > 0 && (
              <>
                <p className="px-2 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  ผลงาน ({filteredWorks.length})
                </p>
                <ul className="space-y-0.5">
                  {filteredWorks.map((p) => {
                    const cover = p.cover_url || p.gallery_urls?.[0] || "";
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/project/${p.id}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-accent/40 transition-colors"
                        >
                          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                            {cover ? (
                              <img
                                src={cover}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center">
                                <Images className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{p.title}</span>
                          {p.status !== "Published" ? (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {p.status}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}

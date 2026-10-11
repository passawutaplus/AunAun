import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, GripVertical, Heart, LayoutGrid, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import MasonryColumns from "@/components/ui/MasonryColumns";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import ProfileWorksReorderGrid from "@/components/profile/ProfileWorksReorderGrid";
import {
  CollectionBrowseToolbar,
  type ProfileWorksSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolioOrder } from "@/hooks/usePortfolioOrder";
import type { DBProject } from "@/hooks/useProjects";
import {
  collectionMasonryClass,
  readCollectionGridDensity,
  writeCollectionGridDensity,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";
import { naturalFeedCoverUrl } from "@/lib/feedProjectCover";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import { ProfileOverallWorkMenu } from "@/components/profile/ProfileOverallWorkMenu";
import { cn } from "@/lib/utils";

const OVERALL_GRID_STORAGE_KEY = "aplus1.profile.overall.grid.density.v2";

type StatusFilter = "Published" | "Draft" | "Private";

const STATUS_LABEL: Record<StatusFilter, string> = {
  Published: "เผยแพร่แล้ว",
  Draft: "แบบร่าง",
  Private: "ส่วนตัว",
};
const STATUS_ORDER: StatusFilter[] = ["Published", "Draft", "Private"];

type Props = {
  projects: DBProject[];
  isLoading?: boolean;
  /** Rendered between the heading and the works (e.g. onboarding checklist). */
  afterHeading?: ReactNode;
};

function CardBadge({ pinNumber, status }: { pinNumber?: number; status: StatusFilter }) {
  if (pinNumber) {
    return (
      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground backdrop-blur">
        <Pin className="h-3 w-3 fill-current" aria-hidden />
        {pinNumber}
      </span>
    );
  }
  if (status === "Published") return null;
  return (
    <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
      {STATUS_LABEL[status]}
    </span>
  );
}

function OverallWorkCard({
  project,
  list,
  allProjects,
  status,
  pinNumber,
}: {
  project: DBProject;
  list: boolean;
  allProjects: DBProject[];
  status: StatusFilter;
  pinNumber?: number;
}) {
  const cover = naturalFeedCoverUrl(project.cover_url || project.gallery_urls?.[0] || "");
  const title = project.title?.trim() || "ไม่มีชื่อ";
  const published = status === "Published";
  // Drafts and private works have no public page: the card opens the editor instead.
  const href = published ? `/project/${project.id}` : `/portfolio/${project.id}/edit`;
  const views = (project.views ?? 0).toLocaleString("th-TH");
  const likes = (project.likes ?? 0).toLocaleString("th-TH");

  const stats = (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      {published ? (
        <>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">{views}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">{likes}</span>
          </span>
        </>
      ) : null}
      <ProfileOverallWorkMenu project={project} allProjects={allProjects} />
    </div>
  );

  if (list) {
    return (
      <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2">
        <Link to={href} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
          <CardBadge pinNumber={pinNumber} status={status} />
        </Link>
        <Link to={href} className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">{title}</h3>
        </Link>
        {stats}
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link to={href} className="group block">
        <div className="relative w-full overflow-hidden rounded-[6px] bg-muted">
          {cover ? (
            <img src={cover} alt={title} className="block h-auto w-full max-w-full" loading="lazy" />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center text-xs text-muted-foreground">
              ไม่มีรูปปก
            </div>
          )}
          <CardBadge pinNumber={pinNumber} status={status} />
        </div>
      </Link>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <Link to={href} className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{title}</h3>
        </Link>
        {stats}
      </div>
    </div>
  );
}

/** Lifetime totals of the published works, so the owner sees at a glance what is working. */
function StatsStrip({ published }: { published: DBProject[] }) {
  const views = published.reduce((sum, p) => sum + (p.views ?? 0), 0);
  const likes = published.reduce((sum, p) => sum + (p.likes ?? 0), 0);
  const top = published.reduce<DBProject | null>(
    (best, p) => ((p.views ?? 0) > (best?.views ?? 0) ? p : best),
    null,
  );
  const tile = "min-w-0 rounded-xl border border-border/60 bg-card/40 px-3 py-2";
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className={tile}>
        <p className="text-[11px] text-muted-foreground">ยอดดูรวม</p>
        <p className="text-base font-medium tabular-nums text-foreground">{views.toLocaleString("th-TH")}</p>
      </div>
      <div className={tile}>
        <p className="text-[11px] text-muted-foreground">ไลก์รวม</p>
        <p className="text-base font-medium tabular-nums text-foreground">{likes.toLocaleString("th-TH")}</p>
      </div>
      <div className={tile}>
        <p className="text-[11px] text-muted-foreground">ผลงานยอดนิยม</p>
        {top && (top.views ?? 0) > 0 ? (
          <Link to={`/project/${top.id}`} className="block truncate text-sm font-medium text-foreground hover:underline">
            {top.title?.trim() || "ไม่มีชื่อ"}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}

/** Owner profile first tab: the portfolio as visitors see it, plus light management (pin, reorder, drafts). */
export default function ProfileOverallWorksPanel({ projects, isLoading, afterHeading }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reorder } = usePortfolioOrder(user?.id);
  const [query, setQuery] = useState("");
  // Same default order visitors get: pinned first, then the order set by the owner.
  const [sortMode, setSortMode] = useState<ProfileWorksSortMode>("portfolio");
  const [statusChoice, setStatusChoice] = useState<StatusFilter | null>(null);
  const [reordering, setReordering] = useState(false);
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(OVERALL_GRID_STORAGE_KEY, "medium"),
  );

  useEffect(() => {
    writeCollectionGridDensity(OVERALL_GRID_STORAGE_KEY, density);
  }, [density]);

  const byStatus = useMemo(() => {
    const groups: Record<StatusFilter, DBProject[]> = { Published: [], Draft: [], Private: [] };
    for (const p of projects) {
      if (p.status === "Published" || p.status === "Draft" || p.status === "Private") groups[p.status].push(p);
    }
    return groups;
  }, [projects]);
  const published = byStatus.Published;

  const status: StatusFilter =
    statusChoice ??
    (published.length ? "Published" : byStatus.Draft.length ? "Draft" : byStatus.Private.length ? "Private" : "Published");
  const showStatusChips = byStatus.Draft.length + byStatus.Private.length > 0;

  // Position among the pinned works, in the order visitors see them.
  const pinNumbers = useMemo(() => {
    const map = new Map<string, number>();
    sortPortfolioProjects(published, "portfolio")
      .filter((p) => p.is_pinned)
      .forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [published]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const group = byStatus[status];
    const filtered = q
      ? group.filter((p) => {
          const title = p.title?.toLowerCase() ?? "";
          const subtitle = p.subtitle?.toLowerCase() ?? "";
          return title.includes(q) || subtitle.includes(q);
        })
      : group;
    return sortPortfolioProjects(filtered, sortMode);
  }, [byStatus, status, query, sortMode]);

  const canReorder = status === "Published" && published.length > 1;

  const startReorder = () => {
    setQuery("");
    setSortMode("portfolio");
    setReordering(true);
  };

  const saveOrder = (ids: string[]) => {
    reorder.mutate(ids, {
      onSuccess: () => {
        toast.success("บันทึกลำดับผลงานแล้ว");
        setReordering(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกลำดับไม่สำเร็จ"),
    });
  };

  if (isLoading) {
    return (
      <div className={collectionMasonryClass("large")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 break-inside-avoid animate-pulse rounded-[6px] bg-muted"
            style={{ height: i % 3 === 0 ? 220 : i % 3 === 1 ? 160 : 280 }}
          />
        ))}
      </div>
    );
  }

  const total = byStatus.Published.length + byStatus.Draft.length + byStatus.Private.length;

  return (
    <div className="space-y-4">
      <ProfileTabHeading
        title="My Projects"
        count={published.length}
        actions={
          total > 0 ? (
            <Button
              size="sm"
              variant="gradient"
              className="rounded-full"
              onClick={() => navigate("/portfolio/new")}
            >
              <Plus className="mr-1 h-4 w-4" /> ลงผลงาน
            </Button>
          ) : null
        }
      />
      {afterHeading}

      {total === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="ยังไม่มีผลงานที่เผยแพร่"
          description="ลงผลงานชิ้นแรก เพื่อรวมไว้ในหน้านี้"
          action={
            <Button className="rounded-full" onClick={() => navigate("/portfolio/new")}>
              ลงผลงาน
            </Button>
          }
        />
      ) : reordering ? (
        <ProfileWorksReorderGrid
          projects={sortPortfolioProjects(published, "portfolio")}
          saving={reorder.isPending}
          onSave={saveOrder}
          onCancel={() => setReordering(false)}
        />
      ) : (
        <div className="space-y-4">
          {published.length > 0 ? <StatsStrip published={published} /> : null}

          {showStatusChips ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="สถานะผลงาน">
              {STATUS_ORDER.filter((s) => s === "Published" || byStatus[s].length > 0).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatusChoice(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    status === s
                      ? "border-foreground bg-foreground font-medium text-background"
                      : "border-border/60 text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                  )}
                >
                  {STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{byStatus[s].length}</span>
                </button>
              ))}
            </div>
          ) : null}

          <CollectionBrowseToolbar
            mode="works"
            searchPlaceholder="ค้นหาชื่อผลงาน..."
            query={query}
            onQueryChange={setQuery}
            density={density}
            onDensityChange={setDensity}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            densityPreset="profile"
            actions={
              canReorder ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full border-border/50 bg-transparent text-xs"
                  onClick={startReorder}
                >
                  <GripVertical className="mr-1 h-3.5 w-3.5" aria-hidden /> จัดลำดับ
                </Button>
              ) : null
            }
          />
          {visible.length === 0 ? (
            <div className="rounded-2xl py-12 text-center glass-panel">
              <p className="mb-1 font-medium text-foreground">
                {query.trim() ? "ไม่พบผลงานที่ตรงเงื่อนไข" : `ไม่มีผลงาน${STATUS_LABEL[status]}`}
              </p>
              {query.trim() ? <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p> : null}
            </div>
          ) : (
            <MasonryColumns
              items={visible}
              density={density}
              getKey={(project) => project.id}
              renderItem={(project) => (
                <OverallWorkCard
                  project={project}
                  list={density === "list"}
                  allProjects={projects}
                  status={status}
                  pinNumber={status === "Published" ? pinNumbers.get(project.id) : undefined}
                />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

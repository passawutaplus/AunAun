import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Heart, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import MasonryColumns from "@/components/ui/MasonryColumns";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import {
  CollectionBrowseToolbar,
  type CollectionItemsSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
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

const OVERALL_GRID_STORAGE_KEY = "aplus1.profile.overall.grid.density.v2";

type Props = {
  projects: DBProject[];
  isLoading?: boolean;
  /** Rendered between the heading and the works (e.g. onboarding checklist). */
  afterHeading?: ReactNode;
};

function OverallWorkCard({
  project,
  list,
  allProjects,
}: {
  project: DBProject;
  list: boolean;
  allProjects: DBProject[];
}) {
  const cover = naturalFeedCoverUrl(project.cover_url || project.gallery_urls?.[0] || "");
  const title = project.title?.trim() || "ไม่มีชื่อ";
  const views = (project.views ?? 0).toLocaleString("th-TH");
  const likes = (project.likes ?? 0).toLocaleString("th-TH");

  const stats = (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        <span className="tabular-nums">{views}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Heart className="h-3.5 w-3.5" aria-hidden />
        <span className="tabular-nums">{likes}</span>
      </span>
      <ProfileOverallWorkMenu project={project} allProjects={allProjects} />
    </div>
  );

  if (list) {
    return (
      <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2">
        <Link to={`/project/${project.id}`} className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </Link>
        <Link to={`/project/${project.id}`} className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">{title}</h3>
        </Link>
        {stats}
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link to={`/project/${project.id}`} className="group block">
        <div className="relative w-full overflow-hidden rounded-[6px] bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={title}
              className="block h-auto w-full max-w-full"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center text-xs text-muted-foreground">
              ไม่มีรูปปก
            </div>
          )}
        </div>
      </Link>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <Link to={`/project/${project.id}`} className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{title}</h3>
        </Link>
        {stats}
      </div>
    </div>
  );
}

/** Owner profile first tab: own works as simple cards — title, views, likes only. */
export default function ProfileOverallWorksPanel({ projects, isLoading, afterHeading }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionItemsSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(OVERALL_GRID_STORAGE_KEY, "medium"),
  );

  useEffect(() => {
    writeCollectionGridDensity(OVERALL_GRID_STORAGE_KEY, density);
  }, [density]);

  const published = useMemo(
    () => projects.filter((p) => p.status === "Published"),
    [projects],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? published.filter((p) => {
          const title = p.title?.toLowerCase() ?? "";
          const subtitle = p.subtitle?.toLowerCase() ?? "";
          return title.includes(q) || subtitle.includes(q);
        })
      : published;
    return sortPortfolioProjects(filtered, sortMode);
  }, [published, query, sortMode]);

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

  return (
    <div className="space-y-4">
      <ProfileTabHeading
        title="My Projects"
        count={published.length}
        description="ผลงานที่เผยแพร่แล้วของคุณ"
        actions={
          published.length > 0 ? (
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

      {published.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          <CollectionBrowseToolbar
            mode="items"
            searchPlaceholder="ค้นหาชื่อผลงาน..."
            query={query}
            onQueryChange={setQuery}
            density={density}
            onDensityChange={setDensity}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            densityPreset="profile"
          />
          {visible.length === 0 ? (
            <div className="rounded-2xl py-12 text-center glass-panel">
              <p className="mb-1 font-medium text-foreground">ไม่พบผลงานที่ตรงเงื่อนไข</p>
              <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p>
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
                />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

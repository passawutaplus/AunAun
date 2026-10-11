import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SearchX, Hash, Bell, BellRing, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ExploreCategoryChips,
  ExplorePalette,
  ExploreRelatedChips,
  ExploreTopCreators,
} from "@/components/explore/ExploreInsights";
import { useExploreFollow } from "@/hooks/useExploreFollow";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import { parentIdForProjectCategory, type CategoryParentId } from "@/data/categoryTaxonomy";
import { BackButton } from "@/components/ui/BackButton";
import ToolIcon from "@/components/ToolIcon";
import ExploreToolFilterBar from "@/components/explore/ExploreToolFilterBar";
import ProjectCard from "@/components/ProjectCard";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import EmptyState from "@/components/ui/EmptyState";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import { useProfilesByIds } from "@/core/profiles";
import { useProjectsByTag, useProjectsByTool, filterProjectsByTools } from "@/hooks/useExploreProjects";
import {
  decodeExploreParam,
  normalizeTag,
  normalizeToolName,
  parseExtraTags,
  parseExtraTools,
  exploreProjectsUrl,
  type ExploreKind,
} from "@/lib/exploreRoutes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth, stashPendingHire, consumePendingHire } from "@/lib/authRedirect";
import type { Category, Project, ProjectStatus } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import { projectAiCardFields } from "@/lib/aiDisclosure";
import type { DBProject } from "@/hooks/useProjects";
import SeoHead from "@/components/SeoHead";
import { shouldNoindexSearchParams } from "@/lib/seo";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seoSchemas";
import { absoluteUrl } from "@/lib/seo";

function mapToCard(
  projects: DBProject[],
  creators: Record<string, { name: string; avatar: string; username?: string; verified?: boolean }>,
): Project[] {
  return projects.map((p) => {
    const o = creators[p.owner_id];
    const collaboratorIds = Array.from(
      new Set(((p.collab_user_ids ?? []) as string[]).filter((id) => id !== p.owner_id)),
    );
    return {
      id: p.id,
      title: p.title,
      image: p.cover_url || (p.gallery_urls?.[0] ?? ""),
      gallery: p.gallery_urls ?? [],
      category: (normalizeProjectCategory(p.category) ?? DEFAULT_PROJECT_CATEGORY) as Category,
      owner: o?.name ?? "ฟรีแลนซ์",
      ownerId: p.owner_id,
      ownerAvatar: o?.avatar ?? "",
      ownerUsername: o?.username,
      ownerVerified: o?.verified,
      collaborators: collaboratorIds.map((id) => ({
        id,
        name: creators[id]?.name ?? "ผู้ร่วมคอลแลป",
        avatar: creators[id]?.avatar ?? "",
        username: creators[id]?.username,
        verified: creators[id]?.verified,
      })),
      likes: p.likes,
      views: p.views,
      comments: 0,
      bookmarked: false,
      status: p.status as ProjectStatus,
      publishedDate: p.created_at,
      tools: p.tools ?? [],
      allowHire: (p as { allow_hire?: boolean }).allow_hire ?? true,
      allowCollab: (p as { allow_collab?: boolean }).allow_collab ?? true,
      licenseType: (p as { license_type?: string }).license_type ?? "all_rights",
      ...projectAiCardFields(p),
    };
  });
}

type ToolExploreSort = "newest" | "views" | "likes";

const SORT_OPTIONS: { key: ToolExploreSort; label: string }[] = [
  { key: "newest", label: "ใหม่สุด" },
  { key: "views", label: "วิวเยอะสุด" },
  { key: "likes", label: "ถูกใจเยอะสุด" },
];

const PAGE_SIZE = 24;
const EXPLORE_GRID =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

const ExploreProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { kind, value: rawValue } = useParams<{ kind: string; value: string }>();
  const exploreKind = (kind === "tool" || kind === "tag" ? kind : null) as ExploreKind | null;
  const value = decodeExploreParam(rawValue);
  // Refinements stack on both pages: ?with=<tools> and ?tags=<tags> — a work must match all of them.
  const extraTools = parseExtraTools(searchParams);
  const extraTags = parseExtraTags(searchParams);
  const refined = extraTools.length > 0 || extraTags.length > 0;

  const syncRefine = useCallback(
    (tools: string[], tags: string[]) => {
      const next: Record<string, string> = {};
      const t = tools.map((x) => x.trim()).filter(Boolean);
      const g = tags.map((x) => x.trim().replace(/^#+/, "")).filter(Boolean);
      if (t.length) next.with = t.join(",");
      if (g.length) next.tags = g.join(",");
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );
  const syncExtraTools = useCallback((next: string[]) => syncRefine(next, extraTags), [syncRefine, extraTags]);

  const addExtraTag = useCallback(
    (tag: string) => {
      const key = normalizeTag(tag);
      if (!key || (exploreKind === "tag" && key === normalizeTag(value))) return;
      if (extraTags.some((t) => normalizeTag(t) === key) || extraTags.length >= 4) return;
      syncRefine(extraTools, [...extraTags, tag]);
    },
    [exploreKind, value, extraTags, extraTools, syncRefine],
  );
  const removeExtraTag = useCallback(
    (tag: string) => syncRefine(extraTools, extraTags.filter((t) => normalizeTag(t) !== normalizeTag(tag))),
    [extraTools, extraTags, syncRefine],
  );

  const addExtraTool = useCallback(
    (tool: string) => {
      const label = tool.trim();
      const key = normalizeToolName(label);
      if (!key || (exploreKind === "tool" && key === normalizeToolName(value))) return;
      if (extraTools.some((t) => normalizeToolName(t) === key)) return;
      if (extraTools.length >= 4) return;
      syncExtraTools([...extraTools, label]);
    },
    [extraTools, syncExtraTools, value, exploreKind],
  );

  const removeExtraTool = useCallback(
    (tool: string) => {
      const key = normalizeToolName(tool);
      syncExtraTools(extraTools.filter((t) => normalizeToolName(t) !== key));
    },
    [extraTools, syncExtraTools],
  );

  const byTool = useProjectsByTool(exploreKind === "tool" ? value : "");
  const byTag = useProjectsByTag(exploreKind === "tag" ? value : "");
  const { data: rows = [], isLoading } = exploreKind === "tool" ? byTool : byTag;
  const [toolSort, setToolSort] = useState<ToolExploreSort>("newest");

  const [categoryFilter, setCategoryFilter] = useState<CategoryParentId | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const follow = useExploreFollow(exploreKind, value);

  // Works matching the tool combo (tool page) — the base for chips, creators and the category filter.
  const baseRows = useMemo(() => {
    let out = extraTools.length ? filterProjectsByTools(rows, extraTools) : rows;
    if (extraTags.length) {
      const need = extraTags.map(normalizeTag);
      out = out.filter((p) => {
        const have = new Set((p.tags ?? []).map(normalizeTag));
        return need.every((t) => have.has(t));
      });
    }
    return out;
  }, [rows, extraTools, extraTags]);

  const filteredRows = useMemo(
    () =>
      categoryFilter === "all"
        ? baseRows
        : baseRows.filter((p) => parentIdForProjectCategory(p.category) === categoryFilter),
    [baseRows, categoryFilter],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [value, categoryFilter, extraTools.length, extraTags.length]);

  const sortedRows = useMemo(() => {
    if (toolSort === "views") {
      return [...filteredRows].sort((a, b) => b.views - a.views || b.likes - a.likes);
    }
    if (toolSort === "likes") {
      return [...filteredRows].sort((a, b) => b.likes - a.likes || b.views - a.views);
    }
    return filteredRows;
  }, [filteredRows, toolSort]);

  const creatorIds = useMemo(
    () =>
      Array.from(
        new Set(
          baseRows
            .flatMap((p) => [p.owner_id, ...((p.collab_user_ids ?? []) as string[])])
            .filter(Boolean),
        ),
      ),
    [baseRows],
  );
  const { data: creatorsData } = useProfilesByIds(creatorIds);
  const creatorsMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string; username?: string; verified?: boolean }> = {};
    (creatorsData?.list ?? []).forEach((p) => {
      map[p.id] = {
        name: p.display_name || p.username || "ฟรีแลนซ์",
        avatar: p.avatar_url || "",
        username: p.username ?? undefined,
        verified: !!p.is_verified,
      };
    });
    return map;
  }, [creatorsData]);

  const projects = useMemo(() => mapToCard(sortedRows, creatorsMap), [sortedRows, creatorsMap]);
  const shownProjects = projects.slice(0, visibleCount);

  const [hireOpen, setHireOpen] = useState(false);
  const [hireProject, setHireProject] = useState("");
  const [hireProjectId, setHireProjectId] = useState<string | undefined>();
  const [hireProjectCover, setHireProjectCover] = useState<string | undefined>();
  const [hireFreelancerId, setHireFreelancerId] = useState<string | undefined>();
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabTarget, setCollabTarget] = useState<{
    recipientId?: string;
    recipientName: string;
    projectId?: string;
    projectTitle?: string;
    projectCoverUrl?: string;
  }>({ recipientName: "" });

  useEffect(() => {
    if (!user) return;
    const pending = consumePendingHire();
    if (!pending) return;
    setHireFreelancerId(pending.freelancerId);
    setHireProject(pending.projectTitle);
    setHireOpen(true);
  }, [user]);

  const openHireForFreelancer = (
    freelancerId: string | undefined,
    projectTitle: string,
    projectId?: string,
    projectCoverUrl?: string,
  ) => {
    if (!freelancerId) return;
    if (!user) {
      stashPendingHire(freelancerId, projectTitle);
      navigateToAuth(navigate);
      return;
    }
    setHireFreelancerId(freelancerId);
    setHireProject(projectTitle);
    setHireProjectId(projectId);
    setHireProjectCover(projectCoverUrl);
    setHireOpen(true);
  };

  if (!exploreKind || !value) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center text-muted-foreground">
        ไม่พบหน้านี้
      </div>
    );
  }

  const title =
    exploreKind === "tool"
      ? refined
        ? `ผลงานที่ใช้ ${value} + ตัวกรองเพิ่ม`
        : `ผลงานที่ใช้ ${value}`
      : refined
        ? `ผลงานแท็ก #${value.replace(/^#+/, "")} + ตัวกรองเพิ่ม`
        : `ผลงานแท็ก #${value.replace(/^#+/, "")}`;

  const emptyToolDescription =
    extraTools.length > 0
      ? `ยังไม่มีผลงานที่ใช้ ${[value, ...extraTools].join(" + ")} ครบทุกเครื่องมือ`
      : `ยังไม่มีผลงานเผยแพร่ที่ระบุเครื่องมือ "${value}"`;

  const followTarget = exploreKind === "tool" ? `เครื่องมือ ${value}` : `แท็ก #${value.replace(/^#+/, "")}`;
  const explorePath = exploreProjectsUrl(exploreKind, value);
  const crumbs = [
    { name: "หน้าแรก", path: "/" },
    { name: title, path: explorePath },
  ];
  const seoNoindex = refined || shouldNoindexSearchParams(searchParams);
  const seoDesc =
    exploreKind === "tool"
      ? `ค้นพบผลงานครีเอเตอร์ที่ใช้ ${value} บน SAMECOR`
      : `ค้นพบผลงานแท็ก #${value.replace(/^#+/, "")} บน SAMECOR`;

  return (
    <div className="min-h-screen bg-app-ambient pb-24">
      <SeoHead
        title={title}
        description={seoDesc}
        path={explorePath}
        noindex={seoNoindex}
        jsonLd={[
          collectionPageJsonLd({ name: title, description: seoDesc, url: absoluteUrl(explorePath) }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
          <BackButton className="shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              {exploreKind === "tool" && extraTools.length === 0 ? (
                <ToolIcon name={value} size="sm" />
              ) : exploreKind === "tag" ? (
                <Hash className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
              <h1 className="truncate text-base font-semibold">{title}</h1>
            </div>
            {extraTags.length > 0 || (exploreKind === "tag" && extraTools.length > 0) ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {(exploreKind === "tag" ? extraTools : []).map((t) => (
                  <button
                    key={`t-${t}`}
                    type="button"
                    onClick={() => syncExtraTools(extraTools.filter((x) => normalizeToolName(x) !== normalizeToolName(t)))}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-xs hover:bg-accent"
                    aria-label={`เอา ${t} ออก`}
                  >
                    <ToolIcon name={t} size="sm" /> {t} <X className="h-3 w-3" aria-hidden />
                  </button>
                ))}
                {extraTags.map((t) => (
                  <button
                    key={`g-${t}`}
                    type="button"
                    onClick={() => removeExtraTag(t)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-xs hover:bg-accent"
                    aria-label={`เอา #${t} ออก`}
                  >
                    <Hash className="h-3 w-3" aria-hidden /> {t} <X className="h-3 w-3" aria-hidden />
                  </button>
                ))}
              </div>
            ) : null}
            {exploreKind === "tool" && (
              <ExploreToolFilterBar
                primaryTool={value}
                extraTools={extraTools}
                onAddTool={addExtraTool}
                onRemoveTool={removeExtraTool}
              />
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 self-start">
            <HeaderAccountActions />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1920px] gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside
          className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-border/50 lg:pr-6 [scrollbar-width:none]"
          aria-label="ตัวกรองและข้อมูลเพิ่มเติม"
        >
          {!refined ? (
            <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/40 p-3">
              <Button
                type="button"
                size="sm"
                variant={follow.following ? "default" : "outline"}
                className="h-9 w-full rounded-full"
                aria-pressed={follow.following}
                disabled={follow.toggle.isPending}
                onClick={() => (follow.signedIn ? follow.toggle.mutate(follow.following) : navigateToAuth(navigate))}
              >
                {follow.following ? <BellRing className="mr-1.5 h-4 w-4" aria-hidden /> : <Bell className="mr-1.5 h-4 w-4" aria-hidden />}
                {follow.following ? `ติดตาม${followTarget}อยู่` : `ติดตาม${followTarget}`}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                {`รับแจ้งเตือนเมื่อมีผลงานใหม่ใน${exploreKind === "tool" ? "เครื่องมือนี้" : "แท็กนี้"}${follow.following ? " · กดเพื่อเลิกติดตาม" : ""}`}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> เรียงตาม
            </span>
            <Select value={toolSort} onValueChange={(v) => setToolSort(v as ToolExploreSort)}>
              <SelectTrigger aria-label="เรียงตาม" className="h-9 w-full rounded-full border-border/50 bg-transparent text-xs">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isLoading && baseRows.length > 0 ? (
            <>
              <ExploreRelatedChips
                rows={baseRows}
                kind={exploreKind}
                value={value}
                selectedTools={extraTools}
                selectedTags={extraTags}
                onAddTool={addExtraTool}
                onAddTag={addExtraTag}
              />
              <ExploreCategoryChips rows={baseRows} value={categoryFilter} onChange={setCategoryFilter} />
              <ExplorePalette rows={baseRows} />
              <ExploreTopCreators rows={baseRows} creators={creatorsMap} />
            </>
          ) : null}
        </aside>
        <div className="min-w-0 space-y-6 lg:col-start-2">
        {isLoading ? (
          <div className={EXPLORE_GRID} aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/3] animate-pulse rounded-[6px] bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="ยังไม่มีผลงาน"
            description={
              exploreKind === "tool"
                ? emptyToolDescription
                : `ยังไม่มีผลงานที่ตรงกับแท็ก "${value}" — ลองแท็กอื่นใกล้เคียง`
            }
            action={
              <button
                onClick={() => navigate("/")}
                className="text-sm text-primary hover:underline"
              >
                กลับหน้าแรก
              </button>
            }
          />
        ) : (
          <StaggerGrid dense className={EXPLORE_GRID}>
            {shownProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onHireClick={() => openHireForFreelancer(p.ownerId, p.title, p.id, p.image)}
                onCollabClick={() => {
                  setCollabTarget({
                    recipientId: p.ownerId,
                    recipientName: p.owner,
                    projectId: p.id,
                    projectTitle: p.title,
                    projectCoverUrl: p.image,
                  });
                  setCollabOpen(true);
                }}
              />
            ))}
          </StaggerGrid>
        )}
        {!isLoading && projects.length > visibleCount ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              ดูเพิ่ม ({projects.length - visibleCount})
            </Button>
          </div>
        ) : null}
        </div>
      </div>

      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={hireProject}
        projectId={hireProjectId}
        projectCoverUrl={hireProjectCover}
        freelancerId={hireFreelancerId}
      />
      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={collabTarget.recipientId}
        recipientName={collabTarget.recipientName}
        projectId={collabTarget.projectId}
        projectTitle={collabTarget.projectTitle}
        projectCoverUrl={collabTarget.projectCoverUrl}
      />
    </div>
  );
};

export default ExploreProjectsPage;

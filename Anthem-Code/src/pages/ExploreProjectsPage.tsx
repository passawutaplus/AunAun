import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SearchX, Hash } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import ToolIcon from "@/components/ToolIcon";
import ExploreToolFilterBar from "@/components/explore/ExploreToolFilterBar";
import ProjectCard from "@/components/ProjectCard";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import ProjectGridSkeleton from "@/components/ui/ProjectGridSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import { useProfilesByIds } from "@/core/profiles";
import { useProjectsByTag, useProjectsByTool, filterProjectsByTools } from "@/hooks/useExploreProjects";
import { decodeExploreParam, normalizeToolName, parseExtraTools, type ExploreKind } from "@/lib/exploreRoutes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth, stashPendingHire, consumePendingHire } from "@/lib/authRedirect";
import type { Category, Project, ProjectStatus } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import type { DBProject } from "@/hooks/useProjects";

function mapToCard(projects: DBProject[], owners: Record<string, { name: string; avatar: string }>): Project[] {
  return projects.map((p) => {
    const o = owners[p.owner_id];
    return {
      id: p.id,
      title: p.title,
      image: p.cover_url || (p.gallery_urls?.[0] ?? ""),
      gallery: p.gallery_urls ?? [],
      category: (normalizeProjectCategory(p.category) ?? DEFAULT_PROJECT_CATEGORY) as Category,
      owner: o?.name ?? "ฟรีแลนซ์",
      ownerId: p.owner_id,
      ownerAvatar: o?.avatar ?? "",
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
    };
  });
}

type ToolExploreSort = "newest" | "views" | "likes";

const TOOL_SORT_OPTIONS: { key: Exclude<ToolExploreSort, "newest">; label: string }[] = [
  { key: "views", label: "วิวเยอะสุด" },
  { key: "likes", label: "กดใจเยอะสุด" },
];

const ExploreProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { kind, value: rawValue } = useParams<{ kind: string; value: string }>();
  const exploreKind = (kind === "tool" || kind === "tag" ? kind : null) as ExploreKind | null;
  const value = decodeExploreParam(rawValue);
  const extraTools = exploreKind === "tool" ? parseExtraTools(searchParams) : [];

  const syncExtraTools = useCallback(
    (next: string[]) => {
      const trimmed = next.map((t) => t.trim()).filter(Boolean);
      if (trimmed.length === 0) {
        setSearchParams({}, { replace: true });
        return;
      }
      setSearchParams({ with: trimmed.join(",") }, { replace: true });
    },
    [setSearchParams],
  );

  const addExtraTool = useCallback(
    (tool: string) => {
      const label = tool.trim();
      const key = normalizeToolName(label);
      if (!key || key === normalizeToolName(value)) return;
      if (extraTools.some((t) => normalizeToolName(t) === key)) return;
      if (extraTools.length >= 4) return;
      syncExtraTools([...extraTools, label]);
    },
    [extraTools, syncExtraTools, value],
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

  const filteredRows = useMemo(() => {
    if (exploreKind !== "tool" || extraTools.length === 0) return rows;
    return filterProjectsByTools(rows, extraTools);
  }, [rows, exploreKind, extraTools]);

  const sortedRows = useMemo(() => {
    if (exploreKind !== "tool") return filteredRows;
    if (toolSort === "views") {
      return [...filteredRows].sort((a, b) => b.views - a.views || b.likes - a.likes);
    }
    if (toolSort === "likes") {
      return [...filteredRows].sort((a, b) => b.likes - a.likes || b.views - a.views);
    }
    return filteredRows;
  }, [filteredRows, exploreKind, toolSort]);

  const ownerIds = useMemo(() => Array.from(new Set(sortedRows.map((p) => p.owner_id))), [sortedRows]);
  const { data: ownersData } = useProfilesByIds(ownerIds);
  const ownersMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string }> = {};
    (ownersData?.list ?? []).forEach((p) => {
      map[p.user_id ?? p.id] = {
        name: p.display_name || p.username || "ฟรีแลนซ์",
        avatar: p.avatar_url || "",
      };
    });
    return map;
  }, [ownersData]);

  const projects = useMemo(() => mapToCard(sortedRows, ownersMap), [sortedRows, ownersMap]);

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
      ? extraTools.length > 0
        ? "ผลงานที่ใช้ร่วมกัน"
        : `ผลงานที่ใช้ ${value}`
      : `ผลงานแท็ก #${value.replace(/^#+/, "")}`;

  const emptyToolDescription =
    extraTools.length > 0
      ? `ยังไม่มีผลงานที่ใช้ ${[value, ...extraTools].join(" + ")} ครบทุกเครื่องมือ`
      : `ยังไม่มีผลงานเผยแพร่ที่ระบุเครื่องมือ "${value}"`;

  return (
    <div className="min-h-screen bg-app-ambient pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton className="shrink-0" />
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {exploreKind === "tool" && extraTools.length === 0 ? (
                <ToolIcon name={value} size="sm" />
              ) : exploreKind === "tag" ? (
                <Hash className="w-4 h-4 text-primary shrink-0" />
              ) : null}
              <h1 className="text-sm font-semibold truncate">{title}</h1>
            </div>
            {exploreKind === "tool" && (
              <ExploreToolFilterBar
                primaryTool={value}
                extraTools={extraTools}
                onAddTool={addExtraTool}
                onRemoveTool={removeExtraTool}
              />
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {exploreKind === "tool" && (
              <div className="flex items-center gap-1">
                {TOOL_SORT_OPTIONS.map(({ key, label }) => {
                  const active = toolSort === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setToolSort((prev) => (prev === key ? "newest" : key))}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] sm:text-xs border transition-colors whitespace-nowrap",
                        active
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              {isLoading ? "…" : `${projects.length} ผลงาน`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <ProjectGridSkeleton />
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
          <StaggerGrid
            dense
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-x-2 sm:gap-x-3 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-6"
          >
            {projects.map((p) => (
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

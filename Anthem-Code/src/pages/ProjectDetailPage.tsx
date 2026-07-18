import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Orbit, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import SharePopover from "@/components/SharePopover";
import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/ui/PageLoader";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import CommentSection from "@/components/CommentSection";
import ProjectSidePanel from "@/components/ProjectSidePanel";
import ProjectContextCard from "@/components/project/ProjectContextCard";
import { hasPendingProjectAssets, parseProjectAssets } from "@/lib/projectAssets";
import ProjectCreditsBlock from "@/components/ProjectCreditsBlock";
import { supabase } from "@/integrations/supabase/client";
import { ProjectContentBlocksView } from "@/components/project/ProjectContentBlocksView";
import { FlexGridView } from "@/components/project/FlexGridView";
import {
  mediaItemsFromBlocks,
  resolveProjectCanvas,
} from "@/lib/projectContentBlocks";
import {
  flexGridMediaItems,
  parseEditorMode,
  parseFlexGridLayout,
} from "@/lib/flexGridLayout";
import { useQuery } from "@tanstack/react-query";

import { useProject } from "@/hooks/useProjects";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth, stripSearchParams } from "@/lib/authRedirect";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import { trackProductEvent } from "@/lib/productEvents";
import { recordProjectViewAffinity } from "@/lib/viewAffinity";
import SeoHead from "@/components/SeoHead";
import SeoBreadcrumb from "@/components/seo/SeoBreadcrumb";
import { BRAND_NAME } from "@/lib/brandConfig";
import BoostButton from "@/components/boost/BoostButton";
import { useAdCampaign, logAdEvent } from "@/hooks/useAds";
import { Megaphone, ExternalLink } from "lucide-react";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import { breadcrumbJsonLd, creativeWorkJsonLd } from "@/lib/seoSchemas";
import { openSafeExternalUrl } from "@/lib/safeUrl";
import { FadeUp } from "@/components/motion/FadeUp";
import { ProjectLinkedPostsBlock } from "@/components/project/ProjectLinkedPostsBlock";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { ProjectOwnerMenu } from "@/components/project/ProjectOwnerMenu";
import {
  fetchLinkedPostSummaries,
  fetchPostsMentioningProject,
  type LinkedPostSummary,
} from "@/lib/portfolioLinkedPosts";
import { profilesPublicFrom, PUBLIC_PROFILE_READ_SELECT } from "@/lib/profileAccess";

const ProjectDetailPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sponsorAdId = searchParams.get("sponsor");
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);
  const { user } = useAuth();
  const { data: dbProject, isLoading, isError, refetch, isFetching } = useProject(id);
  const { data: sponsorAd } = useAdCampaign(sponsorAdId ?? undefined);

  // Track view: per-user history (for personalized Explore feed) + global counter (for stats)
  useEffect(() => {
    if (!dbProject?.id) return;
    const analyticsOk = isCategoryAllowed("analytics");
    // Creator-facing view counter — once per session per project (no visitor PII).
    // Not gated on analytics cookies so "คนดู" on portfolio stays accurate.
    const key = `viewed:${dbProject.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      void supabase
        .rpc("increment_project_view", { _project_id: dbProject.id })
        .then(() => {
          void refetch();
        }, () => {});
    }
    if (analyticsOk) {
      void trackProductEvent("project_view", { project_id: dbProject.id }, { debounceMs: 5_000 });
    }
    recordProjectViewAffinity({
      category: dbProject.category,
      opportunityTypes: (dbProject as { opportunity_types?: string[] | null }).opportunity_types,
    });
    // Per-user history (signed-in + analytics consent) for personalized Explore
    if (user?.id && analyticsOk) {
      supabase
        .from("project_views")
        .upsert(
          { user_id: user.id, project_id: dbProject.id, viewed_at: new Date().toISOString() },
          { onConflict: "user_id,project_id" }
        )
        .then(() => {}, () => {});
    }
  }, [user?.id, dbProject?.id, dbProject?.category, refetch]);

  // Owner: refresh while attachments are still scanning (background job).
  useEffect(() => {
    if (!dbProject?.id || !user?.id || user.id !== dbProject.owner_id) return;
    const assets = parseProjectAssets(
      (dbProject as { project_assets?: unknown }).project_assets,
      (dbProject as { external_links?: unknown }).external_links,
    );
    if (!hasPendingProjectAssets(assets)) return;

    const interval = window.setInterval(() => {
      void refetch();
    }, 5000);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 120_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [
    dbProject?.id,
    dbProject?.owner_id,
    (dbProject as { project_assets?: unknown } | undefined)?.project_assets,
    user?.id,
    refetch,
  ]);


  // Fetch owner profile for DB projects
  const { data: ownerProfile } = useQuery({
    queryKey: ["profile", dbProject?.owner_id],
    enabled: !!dbProject?.owner_id,
    queryFn: async () => {
      const { data } = await profilesPublicFrom()
        .select(PUBLIC_PROFILE_READ_SELECT)
        .eq("user_id", dbProject!.owner_id)
        .maybeSingle();
      return data;
    },
  });

  // Comments count
  const { data: commentsCount = 0 } = useQuery({
    queryKey: ["comments-count", id],
    enabled: !!id && !!dbProject,
    queryFn: async () => {
      const { count } = await supabase
        .from("project_comments")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id!);
      return count ?? 0;
    },
  });

  const editorMode = dbProject
    ? parseEditorMode((dbProject as { editor_mode?: string }).editor_mode)
    : "casual";
  const flexLayout = dbProject
    ? parseFlexGridLayout((dbProject as { flex_grid_layout?: unknown }).flex_grid_layout)
    : null;
  const canvasBlocks = dbProject
    ? resolveProjectCanvas({
        content_blocks: (dbProject as { content_blocks?: unknown }).content_blocks,
        description: dbProject.description,
        gallery_urls: dbProject.gallery_urls ?? [],
        video_urls: ((dbProject as { video_urls?: string[] }).video_urls) ?? [],
      })
    : [];
  const mediaItems =
    editorMode === "flex_grid" && flexLayout
      ? flexGridMediaItems(flexLayout)
      : mediaItemsFromBlocks(canvasBlocks);

  const project = dbProject
    ? {
        id: dbProject.id,
        title: dbProject.title,
        gallery:
          mediaItems.length > 0
            ? mediaItems.map((m) => m.url)
            : dbProject.cover_url
              ? [dbProject.cover_url]
              : [],
        category: dbProject.category,
        ownerId: dbProject.owner_id,
        owner: ownerProfile?.display_name || "ฟรีแลนซ์",
        ownerAvatar: ownerProfile?.avatar_url ?? "",
        likes: dbProject.likes,
        views: dbProject.views,
        bookmarked: false,
        publishedDate: dbProject.created_at,
        tools: dbProject.tools ?? [],
        tags: dbProject.tags ?? [],
        price: dbProject.price_thb ? `฿${dbProject.price_thb.toLocaleString("th-TH")}` : undefined,
        priceThb: dbProject.price_thb ?? null,
        description: dbProject.description ?? "",
        allowHire: (dbProject as any).allow_hire ?? true,
        allowCollab: (dbProject as any).allow_collab ?? true,
        licenseType: dbProject.license_type ?? "all_rights",
        licenseNote: dbProject.license_note ?? "",
        copyrightHolder: dbProject.copyright_holder ?? "",
        hasThirdPartyAssets: dbProject.has_third_party_assets ?? false,
        thirdPartyNote: dbProject.third_party_note ?? "",
        aiAssisted: (dbProject as { ai_assisted?: boolean }).ai_assisted ?? false,
        aiDisclosureNote: (dbProject as { ai_disclosure_note?: string }).ai_disclosure_note ?? "",
        clientPermissionConfirmed:
          (dbProject as { client_permission_confirmed?: boolean }).client_permission_confirmed ?? false,
        context: {
          brief: (dbProject as { brief?: string }).brief,
          creator_role: (dbProject as { creator_role?: string }).creator_role,
          process_note: (dbProject as { process_note?: string }).process_note,
          deliverables: (dbProject as { deliverables?: string }).deliverables,
          duration_label: (dbProject as { duration_label?: string }).duration_label,
          outcome_note: (dbProject as { outcome_note?: string }).outcome_note,
          opportunity_types: (dbProject as { opportunity_types?: string[] }).opportunity_types,
          opportunity_note: (dbProject as { opportunity_note?: string }).opportunity_note,
        },
      }
    : null;

  const [hireOpen, setHireOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const projectIdForLike = dbProject?.id;
  const { likes: likeCount, isLiked: liked, toggle: toggleLike, canInteract } = useProjectLike(projectIdForLike);

  const { data: linkedPosts = [] } = useQuery({
    queryKey: ["project-linked-posts", id, (dbProject as { linked_community_post_ids?: string[] } | undefined)?.linked_community_post_ids],
    enabled: !!id && !!dbProject,
    queryFn: async (): Promise<LinkedPostSummary[]> => {
      const stored = (dbProject as { linked_community_post_ids?: string[] }).linked_community_post_ids ?? [];
      const [fromStored, fromMentions] = await Promise.all([
        stored.length ? fetchLinkedPostSummaries(stored) : Promise.resolve([]),
        fetchPostsMentioningProject(id!),
      ]);
      const byId = new Map<string, LinkedPostSummary>();
      for (const p of [...fromStored, ...fromMentions]) byId.set(p.id, p);
      return Array.from(byId.values());
    },
  });

  useEffect(() => {
    if (!user || searchParams.get("hire") !== "1") return;
    setHireOpen(true);
    const next = stripSearchParams(searchParams, ["hire"]);
    const q = next.toString();
    setSearchParams(q ? next : {}, { replace: true });
  }, [user, searchParams, setSearchParams]);

  const openHire = () => {
    if (!user) {
      navigateToAuth(navigate, { hire: "1" });
      return;
    }
    setHireOpen(true);
  };

  const handleLike = () => {
    if (!canInteract) {
      navigateToAuth(navigate);
      return;
    }
    toggleLike(undefined, {
      onError: (e) => toast.error(mapWriteFlowError(e, "ถูกใจไม่สำเร็จ")),
    });
  };

  if (isLoading || (isFetching && !dbProject)) {
    return <PageLoader label="กำลังโหลดผลงาน… รอสักครู่" className="bg-app-ambient" />;
  }
  if (isError) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-muted-foreground">โหลดผลงานไม่สำเร็จ — อาจเป็นชั่วคราวหรือคุณไม่มีสิทธิ์ดูผลงานนี้</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void refetch()}>ลองใหม่</Button>
            <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
          </div>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ไม่พบผลงานนี้ หรือยังไม่ได้เผยแพร่</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/project/${id}`;
  const isOwner = !!user?.id && user.id === dbProject?.owner_id;

  const coverImage =
    dbProject?.cover_url ??
    project.gallery.find((url) => !isVideoUrl(url)) ??
    "";

  const projectPath = `/project/${project.id}`;
  const crumbs = [
    { name: "หน้าแรก", path: "/" },
    { name: "ผลงาน", path: "/" },
    { name: project.title, path: projectPath },
  ];
  const authorUrl = project.ownerId ? absoluteUrl(`/u/${project.ownerId}`) : undefined;

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead
        title={project.title}
        description={truncateDescription(
          project.description || `${project.title} โดย ${project.owner} — ${project.category} บน ${BRAND_NAME}`,
        )}
        path={projectPath}
        image={coverImage || undefined}
        type="article"
        jsonLd={[
          creativeWorkJsonLd({
            name: project.title,
            description: project.description || project.title,
            image: coverImage || undefined,
            authorName: project.owner,
            authorUrl,
            url: absoluteUrl(projectPath),
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton />
            <SeoBreadcrumb items={crumbs} className="mb-0 hidden md:flex min-w-0" />
          </div>
          <div className="flex items-center gap-1">
            {isOwner && dbProject ? (
              <ProjectOwnerMenu projectId={dbProject.id} projectTitle={project.title} />
            ) : null}
            {dbProject ? (
              <BoostButton
                targetType="project"
                targetId={dbProject.id}
                targetTitle={project.title}
                ownerId={dbProject.owner_id}
                size="sm"
              />
            ) : null}
            <SaveToCollectionPopover projectId={dbProject?.id}>
              <Button variant="ghost" size="icon">
                <Layers3 className="w-5 h-5" />
              </Button>
            </SaveToCollectionPopover>
            {dbProject?.status === "Published" && user?.id === dbProject.owner_id && !isAplus1LaunchMinimal() ? (
              <Button variant="ghost" size="icon" asChild title="แชร์ไป Area Post">
                <Link to={`/community/new?fromProject=${dbProject.id}`}>
                  <Orbit className="w-5 h-5" />
                </Link>
              </Button>
            ) : null}
            <SharePopover url={shareUrl} title={project.title} label="แชร์ผลงาน">
              <Button variant="ghost" size="icon">
                <Share2 className="w-5 h-5" />
              </Button>
            </SharePopover>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        {sponsorAd && sponsorAdId ? (
          <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Sponsored</p>
                <p className="font-medium text-sm">{sponsorAd.title}</p>
                {sponsorAd.tagline ? (
                  <p className="text-xs text-muted-foreground">{sponsorAd.tagline}</p>
                ) : null}
              </div>
            </div>
            {sponsorAd.target_url ? (
              <Button
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => {
                  void logAdEvent(sponsorAdId, "click", "detail");
                  openSafeExternalUrl(sponsorAd.target_url);
                }}
              >
                {sponsorAd.cta_label || "เรียนรู้เพิ่มเติม"}
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
          {/* Left: Gallery */}
          {/* Left: Gallery */}
          <div className="space-y-4 min-w-0">
            {dbProject && (
              <ProjectCreditsBlock
                studioId={(dbProject as any).studio_id}
                creditedUserIds={(dbProject as any).credited_user_ids ?? []}
                ownerId={dbProject.owner_id}
              />
            )}
            {editorMode === "flex_grid" && flexLayout ? (
              <FlexGridView layout={flexLayout} className="max-w-3xl" />
            ) : canvasBlocks.length > 0 ? (
              <ProjectContentBlocksView
                blocks={canvasBlocks}
                className="max-w-2xl"
                projectId={dbProject?.id ?? project.id}
                projectTitle={project.title}
              />
            ) : (
              <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                ยังไม่มีเนื้อหา
              </div>
            )}
          </div>

          {/* Right: Side panel (sticky on desktop) */}
          <FadeUp className="lg:sticky lg:top-20 lg:self-start" delay={0.06}>
            <ProjectSidePanel
              projectId={dbProject?.id}
              title={project.title}
              category={project.category}
              ownerName={project.owner}
              ownerAvatar={project.ownerAvatar}
              ownerId={project.ownerId}
              publishedDate={project.publishedDate}
              description={project.description}
              tools={project.tools}
              tags={project.tags}
              price={project.price}
              priceThb={project.priceThb}
              views={project.views}
              likes={likeCount}
              commentsCount={commentsCount}
              liked={liked}
              onLike={handleLike}
              onHire={openHire}
              onCollab={() => setCollabOpen(true)}
              allowHire={project.allowHire}
              allowCollab={project.allowCollab}
              isOwner={isOwner}
              projectAssets={parseProjectAssets(
                (dbProject as { project_assets?: unknown } | undefined)?.project_assets,
                (dbProject as { external_links?: unknown } | undefined)?.external_links,
              )}
              licenseType={project.licenseType}
              licenseNote={project.licenseNote}
              copyrightHolder={project.copyrightHolder}
              hasThirdPartyAssets={project.hasThirdPartyAssets}
              thirdPartyNote={project.thirdPartyNote}
              aiAssisted={project.aiAssisted}
              aiDisclosureNote={project.aiDisclosureNote}
              clientPermissionConfirmed={project.clientPermissionConfirmed}
            />
          </FadeUp>
        </div>

        <div className="mt-10 lg:mt-14 max-w-3xl space-y-6">
          {linkedPosts.length > 0 && <ProjectLinkedPostsBlock posts={linkedPosts} />}
          <ProjectContextCard context={project.context} />
          <CommentSection projectId={project.id} />
        </div>
      </div>


      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={project.title}
        projectId={project.id}
        projectCoverUrl={dbProject?.cover_url || dbProject?.gallery_urls?.[0]}
        freelancerId={project.ownerId}
      />

      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={project.ownerId}
        recipientName={project.owner}
        projectId={project.id}
        projectTitle={project.title}
        projectCoverUrl={dbProject?.cover_url || dbProject?.gallery_urls?.[0]}
      />
    </div>
  );
};


export default ProjectDetailPage;

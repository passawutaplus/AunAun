import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Orbit, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import SharePopover from "@/components/SharePopover";
import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import CommentSection from "@/components/CommentSection";
import ProjectSidePanel from "@/components/ProjectSidePanel";
import ProjectContextCard from "@/components/project/ProjectContextCard";
import ProjectCreditsBlock from "@/components/ProjectCreditsBlock";
import { supabase } from "@/integrations/supabase/client";
import ImageActionBar from "@/components/project/ImageActionBar";
import ImageLightbox from "@/components/project/ImageLightbox";
import SafeDemoImage from "@/components/SafeDemoImage";
import { useQuery } from "@tanstack/react-query";

import { useProject } from "@/hooks/useProjects";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth, stripSearchParams } from "@/lib/authRedirect";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import BoostButton from "@/components/boost/BoostButton";
import { useAdCampaign, logAdEvent } from "@/hooks/useAds";
import { Megaphone, ExternalLink } from "lucide-react";
import { truncateDescription } from "@/lib/seo";
import LicenseDetailBlock from "@/components/license/LicenseDetailBlock";
import { FadeUp } from "@/components/motion/FadeUp";
import { staggerReveal, viewportOnce } from "@/lib/motion";
import { isVideoUrl, mediaItemsFromProject } from "@/lib/portfolioMedia";
import { ProjectLinkedPostsBlock } from "@/components/project/ProjectLinkedPostsBlock";
import { ProjectOwnerMenu } from "@/components/project/ProjectOwnerMenu";
import {
  fetchLinkedPostSummaries,
  fetchPostsMentioningProject,
  type LinkedPostSummary,
} from "@/lib/portfolioLinkedPosts";

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
    // Global counter — once per session per project (requires analytics consent)
    const key = `viewed:${dbProject.id}`;
    if (analyticsOk && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      supabase.rpc("increment_project_view", { _project_id: dbProject.id }).then(() => {}, () => {});
    }
    // Per-user history (only when signed-in)
    if (user?.id && analyticsOk) {
      supabase
        .from("project_views")
        .upsert(
          { user_id: user.id, project_id: dbProject.id, viewed_at: new Date().toISOString() },
          { onConflict: "user_id,project_id" }
        )
        .then(() => {}, () => {});
    }
  }, [user?.id, dbProject?.id]);


  // Fetch owner profile for DB projects
  const { data: ownerProfile } = useQuery({
    queryKey: ["profile", dbProject?.owner_id],
    enabled: !!dbProject?.owner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, opportunity_status, opportunity_types")
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

  const mediaItems = dbProject
    ? mediaItemsFromProject(
        dbProject.gallery_urls ?? [],
        ((dbProject as { video_urls?: string[] }).video_urls) ?? [],
      )
    : [];

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
        description: dbProject.description ?? "",
        allowHire: (dbProject as any).allow_hire ?? true,
        allowCollab: (dbProject as any).allow_collab ?? true,
        licenseType: dbProject.license_type ?? "all_rights",
        licenseNote: dbProject.license_note ?? "",
        copyrightHolder: dbProject.copyright_holder ?? "",
        hasThirdPartyAssets: dbProject.has_third_party_assets ?? false,
        thirdPartyNote: dbProject.third_party_note ?? "",
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
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center text-muted-foreground px-4 text-center">
        กำลังโหลดผลงาน… รอสักครู่
      </div>
    );
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

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead
        title={project.title}
        description={truncateDescription(
          project.description || `${project.title} โดย ${project.owner} — ${project.category} บน ${BRAND_NAME}`,
        )}
        path={`/project/${project.id}`}
        image={coverImage || undefined}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.description || project.title,
          image: coverImage || undefined,
          author: { "@type": "Person", name: project.owner },
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }}
      />
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
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
            {dbProject?.status === "Published" && user?.id === dbProject.owner_id ? (
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
                  window.open(sponsorAd.target_url, "_blank", "noopener,noreferrer");
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
            {project.gallery.length > 0 ? (
              <GalleryWithLightbox items={mediaItems} project={project} />
            ) : (
              <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                ยังไม่มีรูปภาพ
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
              ownerOpportunityStatus={(ownerProfile as { opportunity_status?: string } | null)?.opportunity_status}
              ownerOpportunityTypes={(ownerProfile as { opportunity_types?: string[] } | null)?.opportunity_types}
              projectOpportunityTypes={project.context.opportunity_types}
            />
            <div className="mt-4">
              <LicenseDetailBlock
                licenseType={project.licenseType}
                licenseNote={project.licenseNote}
                copyrightHolder={project.copyrightHolder}
                ownerName={project.owner}
                hasThirdPartyAssets={project.hasThirdPartyAssets}
                thirdPartyNote={project.thirdPartyNote}
                allowHire={project.allowHire}
                onHire={openHire}
              />
            </div>
          </FadeUp>
        </div>

        <div className="mt-10 lg:mt-14 max-w-3xl space-y-6">
          <ProjectContextCard context={project.context} />
          {linkedPosts.length > 0 && <ProjectLinkedPostsBlock posts={linkedPosts} />}
          <CommentSection projectId={project.id} />
        </div>
      </div>


      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={project.title}
        projectId={project.id}
        freelancerId={project.ownerId}
      />

      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={project.ownerId}
        recipientName={project.owner}
        projectId={project.id}
        projectTitle={project.title}
      />
    </div>
  );
};


type GalleryProject = { id: string; title: string };
const GalleryWithLightbox = ({
  items,
  project,
}: {
  items: ReturnType<typeof mediaItemsFromProject>;
  project: GalleryProject;
}) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const imgIndex = (i: number) =>
    project.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + i;
  return (
    <>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          className="relative group"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={staggerReveal(i)}
        >
          {item.kind === "video" ? (
            <video
              src={item.url}
              controls
              playsInline
              className="w-full rounded-2xl border border-border/60 bg-black max-h-[480px]"
            />
          ) : (
            <>
              <SafeDemoImage
                src={item.url}
                index={imgIndex(i)}
                alt={`${project.title} ${i + 1}`}
                onClick={() => setLightboxSrc(item.url)}
                className="w-full rounded-2xl border border-border/60 bg-card object-contain cursor-zoom-in"
                loading="lazy"
              />
              <ImageActionBar
                projectId={project.id}
                projectTitle={project.title}
                imageUrl={item.url}
                imageIndex={i}
              />
            </>
          )}
        </motion.div>
      ))}
      <ImageLightbox
        src={lightboxSrc ?? ""}
        alt={project.title}
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </>
  );
};

export default ProjectDetailPage;

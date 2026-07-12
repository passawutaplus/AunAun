import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Handshake, ImagePlus, Library, Loader2, Save, X } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCreateProject, useProject, useUpdateProject } from "@/hooks/useProjects";
import {
  assignProjectToSeries,
  useMyProjectSeries,
  useSeriesForProject,
} from "@/hooks/useProjectSeries";
import { useQueryClient } from "@tanstack/react-query";
import { isUuid } from "@/lib/uuid";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { getProjectLimits } from "@/lib/projectLimits";
import { supabase } from "@/integrations/supabase/client";
import { projectSchema, validateProjectBasics, validateProjectPublish } from "@/lib/validators";
import { portfolioEditorHasContent } from "@/lib/portfolioEditorStorage";
import { categories, DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import PageLoader from "@/components/ui/PageLoader";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import StudioCreditPicker from "@/components/profile/StudioCreditPicker";
import LicensePicker from "@/components/license/LicensePicker";
import TagPicker from "@/components/tags/TagPicker";
import ToolPicker from "@/components/tools/ToolPicker";
import ProjectPreviewDialog, { type ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";
import { PortfolioCoverCropDialog } from "@/components/project/PortfolioCoverCropDialog";
import {
  ModuleImageCropDialog,
  urlToImageFile,
  type ModuleImageCropConfirmResult,
} from "@/components/project/ModuleImageCropDialog";
import { cropImageFileToAspectFile, cropImageUrlToAspectFile } from "@/lib/cropImage";
import { communityMediaAspectMeta, normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import ProjectContextEditorFields, {
  type ProjectContextForm,
} from "@/components/project/ProjectContextEditorFields";
import ProjectAssetsEditor from "@/components/project/ProjectAssetsEditor";
import {
  parseProjectAssets,
  toStoredProjectAssets,
  projectAssetsToExternalLinks,
  hasPendingProjectAssets,
  type ProjectAsset,
} from "@/lib/projectAssets";
import { enqueueProjectAssetScan } from "@/lib/triggerProjectAssetScan";
import { hasProjectContextContent } from "@/lib/opportunity";
import type { ProjectPreviewMode } from "@/components/project/ProjectPreviewModeTabs";
import ThirdPartyAssetsToggle from "@/components/license/ThirdPartyAssetsToggle";
import OriginalWorkAttestation from "@/components/license/OriginalWorkAttestation";
import AiDisclosureToggle from "@/components/license/AiDisclosureToggle";
import ClientPermissionConfirm from "@/components/license/ClientPermissionConfirm";
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { type LicenseType, isLicenseType } from "@/lib/licenses";
import { ProjectEditorToolsSidebar } from "@/components/project/ProjectEditorToolsSidebar";
import { ProjectEditorMetaSidebar } from "@/components/project/ProjectEditorMetaSidebar";
import { ProjectCanvasEditor } from "@/components/project/ProjectCanvasEditor";
import { CanvasTemplatePreviewDialog } from "@/components/project/CanvasTemplatePreviewDialog";
import {
  ProjectCategoryPicker,
  ProjectSeriesPicker,
} from "@/components/project/ProjectEditorSearchSelects";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import { PortfolioLinkedPostPicker } from "@/components/project/PortfolioLinkedPostPicker";
import { isAplus1LaunchMinimal, isAplus1SubscriptionsEnabled, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";
import { PortfolioCollabUserPicker } from "@/components/project/PortfolioCollabUserPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CanvasToolPayload } from "@/lib/canvasToolDrag";
import { useCanvasTemplates, type UserCanvasTemplate } from "@/hooks/useCanvasTemplates";
import {
  createContentBlock,
  createGalleryPlaceholder,
  createGridPlaceholder,
  createMediaBlock,
  createMediaPlaceholder,
  createMultiRowPlaceholder,
  createImageTextPlaceholder,
  hydrateProjectCanvas,
  mediaItemsFromBlocks,
  parseGalleryDisplayMode,
  splitMediaFromBlocks,
  toStoredContentBlocks,
  blockImageUrls,
  type GalleryDisplayMode,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import {
  isThreeSplitGridLayout,
  parsePhotoGridPickerLayout,
  photoGridSlotCount,
  threeSplitSlotCropSpec,
  type PhotoGridLayout,
} from "@/lib/photoGridLayouts";
import { countMediaByKind } from "@/lib/portfolioMedia";
import { mergeDrillTags } from "@/lib/drillProject";
import { DrillPostNotice } from "@/components/drill/DrillPostNotice";
import {
  fetchLinkedPostSummaries,
  isMissingProjectLinkColumnError,
  linkedPostIds,
  resolveLinkedPostIds,
  syncProjectMentionsOnPosts,
  type LinkedPostSummary,
} from "@/lib/portfolioLinkedPosts";
import {
  fetchProjectCollabInvites,
  syncProjectCollabInvites,
  type ProjectCollabInvite,
} from "@/lib/portfolioCollabInvites";
import { fetchTaggedUserSummaries, type TaggedUserSummary } from "@/lib/communityTaggedUsers";
import { cn } from "@/lib/utils";

type Status = "Published" | "Draft" | "Private";

const ProjectEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = !!id;
  const isDrillPost = params.get("from") === "so1o" && params.get("drill_type");
  const isDailyDrillPost = isDrillPost && params.get("drill_type") === "daily";
  const { user, loading: authLoading } = useAuth();
  const ensureVerified = useEnsureSensitiveAction();
  const { data: isAdmin } = useIsAdmin();
  const { tier } = useSubscription();
  const limits = getProjectLimits(tier);
  const folderRef = useRef<string>(id ?? crypto.randomUUID());
  const drillMetaRef = useRef<{ drill_type?: string; drill_date?: string }>({});

  const {
    data: existing,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useProject(editing ? id : undefined);
  const create = useCreateProject();
  const update = useUpdateProject();
  const { data: mySeries = [] } = useMyProjectSeries(user?.id);
  const { data: projectSeriesLink, isFetched: seriesLinkFetched } = useSeriesForProject(
    editing && id && isUuid(id) ? id : undefined,
  );
  const seriesHydratedRef = useRef(false);
  /** Prevent re-applying DB → form when auth refreshes / query identity churns (loses in-progress edits). */
  const formHydratedForIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ProjectContentBlock[]>([]);
  const [galleryDisplayMode, setGalleryDisplayMode] = useState<GalleryDisplayMode>("gallery");
  const [gridLayout, setGridLayout] = useState<PhotoGridLayout>("four_quad");
  const [category, setCategory] = useState<string>("");
  const [cover, setCover] = useState<string>("");
  const [tools, setTools] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("");
  const [showPrice, setShowPrice] = useState(false);
  const [status, setStatus] = useState<Status>("Draft");
  const [seriesId, setSeriesId] = useState<string>("");
  const [seriesCreateOpen, setSeriesCreateOpen] = useState(false);
  const [allowHire, setAllowHire] = useState(true);
  const [allowCollab, setAllowCollab] = useState(true);
  const [studioId, setStudioId] = useState<string | null>(null);
  const [creditedIds, setCreditedIds] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState<LicenseType>("all_rights");
  const [licenseNote, setLicenseNote] = useState("");
  const [copyrightHolder, setCopyrightHolder] = useState("");
  const [hasThirdPartyAssets, setHasThirdPartyAssets] = useState(false);
  const [thirdPartyNote, setThirdPartyNote] = useState("");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [aiDisclosureNote, setAiDisclosureNote] = useState("");
  const [clientPermissionConfirmed, setClientPermissionConfirmed] = useState(false);
  const [rightsAttested, setRightsAttested] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishAttestChecked, setPublishAttestChecked] = useState(false);
  const [toolInput, setToolInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [moduleCropFile, setModuleCropFile] = useState<File | null>(null);
  const [moduleCropOpen, setModuleCropOpen] = useState(false);
  const [moduleCropTarget, setModuleCropTarget] = useState<{
    blockId: string;
    slotIndex?: number;
    sourceUrl: string;
    gallerySlide?: boolean;
    lockedCrop?: { ratio: number; exportW: number; exportH: number; label: string };
  } | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [toolsTab, setToolsTab] = useState<"template" | "module">("module");
  const emptyStartImageInputRef = useRef<HTMLInputElement>(null);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<ProjectPreviewMode>("pc");
  const [linkedOwnPosts, setLinkedOwnPosts] = useState<LinkedPostSummary[]>([]);
  const [linkedCollabPosts, setLinkedCollabPosts] = useState<LinkedPostSummary[]>([]);
  const [collabSelected, setCollabSelected] = useState<TaggedUserSummary[]>([]);
  const [collabAccepted, setCollabAccepted] = useState<TaggedUserSummary[]>([]);
  const [collabPending, setCollabPending] = useState<TaggedUserSummary[]>([]);
  const [projectContext, setProjectContext] = useState<ProjectContextForm>({
    brief: "",
    creatorRole: "",
    processNote: "",
    deliverables: "",
    durationLabel: "",
    outcomeNote: "",
  });
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [templateNameDialog, setTemplateNameDialog] = useState<
    null | { mode: "save" } | { mode: "rename"; template: UserCanvasTemplate }
  >(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [pendingUpdateTemplate, setPendingUpdateTemplate] = useState<UserCanvasTemplate | null>(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<UserCanvasTemplate | null>(null);
  const {
    templates,
    isLoading: templatesLoading,
    atLimit: templatesAtLimit,
    createFromBlocks,
    rename: renameTemplate,
    updateModulesFromBlocks,
    remove: removeTemplate,
    buildBlocks,
  } = useCanvasTemplates();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const patchProjectContext = useCallback((patch: Partial<ProjectContextForm>) => {
    setProjectContext((c) => ({ ...c, ...patch }));
  }, []);
  const scheduleBackgroundAssetScan = useCallback((projectId: string) => {
    if (!hasPendingProjectAssets(projectAssets)) return;
    toast.message("กำลังตรวจสอบไฟล์แนบ/ลิงก์ในพื้นหลัง — จะแจ้งเมื่อเสร็จ");
    enqueueProjectAssetScan(projectId, ({ blockedCount }) => {
      if (blockedCount > 0) {
        toast.warning(
          `มี ${blockedCount} รายการไม่ผ่านการตรวจสอบ — ดูรายละเอียดในหน้าแก้ไข`,
        );
      }
    });
  }, [projectAssets]);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio/new");
  }, [authLoading, user, navigate]);

  // Switching projects (or leaving edit) must allow a fresh hydrate.
  useEffect(() => {
    formHydratedForIdRef.current = null;
    seriesHydratedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (editing) return;
    const prefillSeries = params.get("series")?.trim();
    if (prefillSeries && isUuid(prefillSeries)) setSeriesId(prefillSeries);
  }, [editing, params]);

  useEffect(() => {
    if (!editing || !seriesLinkFetched || seriesHydratedRef.current) return;
    seriesHydratedRef.current = true;
    setSeriesId(projectSeriesLink?.series?.id ?? "");
  }, [editing, seriesLinkFetched, projectSeriesLink?.series?.id]);

  useEffect(() => {
    if (editing || existing) return;
    if (params.get("from") !== "so1o") return;
    const prefillTitle = params.get("title")?.trim();
    const prefillClient = params.get("client")?.trim();
    const prefillDesc = params.get("description")?.trim();
    const prefillCat = params.get("category")?.trim();
    const prefillTags = params.get("tags")?.trim();
    const drillType = params.get("drill_type")?.trim();
    const drillDate = params.get("drill_date")?.trim();
    if (prefillTitle) setTitle(prefillTitle);
    if (prefillDesc) setShortDescription(prefillDesc);
    if (prefillCat) {
      const resolved = normalizeProjectCategory(prefillCat) ?? (categories.includes(prefillCat as Category) ? prefillCat : null);
      if (resolved) setCategory(resolved);
    }
    if (prefillTags) {
      setTags(
        prefillTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      );
    }
    drillMetaRef.current = { drill_type: drillType, drill_date: drillDate };
    if (prefillClient && !prefillDesc) {
      setShortDescription(`โปรเจกต์สำหรับลูกค้า ${prefillClient} — เสร็จจาก So1o Job Tracker`);
    }
  }, [editing, existing, params]);

  useEffect(() => {
    if (!authLoading && editing && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/portfolio/${id}/edit`)}`);
    }
  }, [authLoading, editing, user, id, navigate]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setToolsExpanded(mq.matches);
      setMetaExpanded(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!existing) return;
    if (editing && user && existing.owner_id !== user.id && !isAdmin) return;
    // Only hydrate once per project id. Re-running on every `user`/`existing`
    // reference change (e.g. TOKEN_REFRESHED when returning to the tab) was
    // wiping canvas/title edits that had not been saved yet.
    if (formHydratedForIdRef.current === existing.id) return;
    formHydratedForIdRef.current = existing.id;
    setTitle(existing.title);
      const extContent = existing as {
        content_blocks?: unknown;
      };
      const canvas = hydrateProjectCanvas({
        content_blocks: extContent.content_blocks,
        description: existing.description,
        gallery_urls: existing.gallery_urls ?? [],
        video_urls: ((existing as { video_urls?: string[] }).video_urls) ?? [],
      });
      setContentBlocks(canvas);
      // If DB already had content_blocks, keep description as short blurb; else description was folded into canvas.
      const hadStoredBlocks =
        Array.isArray(extContent.content_blocks) && extContent.content_blocks.length > 0;
      setShortDescription(hadStoredBlocks ? (existing.description ?? "") : "");
      setGalleryDisplayMode(
        parseGalleryDisplayMode((existing as { gallery_display_mode?: string }).gallery_display_mode),
      );
      setGridLayout(parsePhotoGridPickerLayout((existing as { grid_layout?: string }).grid_layout));
      setCategory(existing.category);
      setCover(existing.cover_url ?? "");
      setTools(existing.tools ?? []);
      setTags(existing.tags ?? []);
      setPrice(existing.price_thb ? String(existing.price_thb) : "");
      setShowPrice(!!existing.price_thb);
      setStatus(existing.status as Status);
      setAllowHire((existing as any).allow_hire ?? true);
      setAllowCollab((existing as any).allow_collab ?? true);
      setStudioId((existing as any).studio_id ?? null);
      setCreditedIds(((existing as any).credited_user_ids as string[]) ?? []);
      const lt = (existing as { license_type?: string }).license_type;
      setLicenseType(isLicenseType(lt ?? "") ? lt : "all_rights");
      setLicenseNote((existing as { license_note?: string }).license_note ?? "");
      setCopyrightHolder((existing as { copyright_holder?: string }).copyright_holder ?? "");
      setHasThirdPartyAssets((existing as { has_third_party_assets?: boolean }).has_third_party_assets ?? false);
      setThirdPartyNote((existing as { third_party_note?: string }).third_party_note ?? "");
      setAiAssisted((existing as { ai_assisted?: boolean }).ai_assisted ?? false);
      setAiDisclosureNote((existing as { ai_disclosure_note?: string }).ai_disclosure_note ?? "");
      setClientPermissionConfirmed(
        (existing as { client_permission_confirmed?: boolean }).client_permission_confirmed ??
          !!(existing as { copyright_holder?: string }).copyright_holder?.trim(),
      );
      setRightsAttested(!!(existing as { rights_attested_at?: string | null }).rights_attested_at);
      const extCtx = existing as {
        brief?: string | null;
        creator_role?: string | null;
        process_note?: string | null;
        deliverables?: string | null;
        duration_label?: string | null;
        outcome_note?: string | null;
      };
      setProjectContext({
        brief: extCtx.brief ?? "",
        creatorRole: extCtx.creator_role ?? "",
        processNote: extCtx.process_note ?? "",
        deliverables: extCtx.deliverables ?? "",
        durationLabel: extCtx.duration_label ?? "",
        outcomeNote: extCtx.outcome_note ?? "",
      });
      setProjectAssets(
        parseProjectAssets(
          (existing as { project_assets?: unknown }).project_assets,
          (existing as { external_links?: unknown }).external_links,
        ),
      );
      setContextExpanded(
        hasProjectContextContent(extCtx) || !!(existing.description ?? "").trim(),
      );
      void (async () => {
        const ext = existing as {
          linked_community_post_ids?: string[];
          collab_user_ids?: string[];
        };
        const linkedIds = ext.linked_community_post_ids ?? [];
        const collabIds = ext.collab_user_ids ?? [];
        try {
          if (linkedIds.length) {
            const summaries = await fetchLinkedPostSummaries(linkedIds);
            const own = summaries.filter((p) => p.author_id === existing.owner_id);
            const collab = summaries.filter((p) => p.author_id !== existing.owner_id);
            setLinkedOwnPosts(own);
            setLinkedCollabPosts(collab);
          }
          if (collabIds.length) {
            setCollabAccepted(await fetchTaggedUserSummaries(collabIds));
          }
          if (editing && id && isUuid(id)) {
            const invites = await fetchProjectCollabInvites(id);
            const pendingIds = invites
              .filter((i: ProjectCollabInvite) => i.status === "pending")
              .map((i) => i.invited_user_id);
            if (pendingIds.length) {
              setCollabPending(await fetchTaggedUserSummaries(pendingIds));
            }
          }
        } catch {
          /* migration may be pending */
        }
      })();
  }, [existing, editing, user, isAdmin, id]);

  const allLinkedPostIds = useMemo(
    () => linkedPostIds([...linkedOwnPosts, ...linkedCollabPosts]),
    [linkedOwnPosts, linkedCollabPosts],
  );

  const buildProjectPayload = useCallback(
    (targetStatus: Status) => {
      const { gallery_urls, video_urls } = splitMediaFromBlocks(contentBlocks);
      const finalTags = mergeDrillTags(
        tags,
        drillMetaRef.current.drill_type,
        drillMetaRef.current.drill_date,
      );
      const rightsAttestedAt = rightsAttested ? new Date().toISOString() : null;

      const storedBlocks = toStoredContentBlocks(contentBlocks);

      return {
        title: title.trim(),
        subtitle: "",
        description: shortDescription.trim(),
        category,
        cover_url: cover,
        gallery_urls,
        video_urls,
        tools,
        tags: finalTags,
        price_thb: showPrice && price ? Number(price) : null,
        status: targetStatus,
        allow_hire: allowHire,
        allow_collab: allowCollab,
        studio_id: studioId,
        credited_user_ids: studioId ? creditedIds : [],
        linked_community_post_ids: allLinkedPostIds,
        collab_user_ids: collabAccepted.map((u) => u.user_id),
        license_type: licenseType,
        license_note: licenseNote.trim(),
        has_third_party_assets: hasThirdPartyAssets,
        third_party_note: thirdPartyNote.trim(),
        ai_assisted: aiAssisted,
        ai_disclosure_note: aiAssisted ? aiDisclosureNote.trim() : "",
        client_permission_confirmed: clientPermissionConfirmed,
        copyright_holder: clientPermissionConfirmed ? copyrightHolder.trim() : "",
        rights_attested_at: rightsAttestedAt,
        rights_attestation_version: rightsAttested ? LEGAL_ATTESTATION_VERSION : null,
        brief: projectContext.brief.trim(),
        creator_role: projectContext.creatorRole.trim(),
        process_note: projectContext.processNote.trim(),
        deliverables: projectContext.deliverables.trim(),
        duration_label: projectContext.durationLabel.trim(),
        outcome_note: projectContext.outcomeNote.trim(),
        opportunity_types: [],
        opportunity_note: "",
        external_links: projectAssetsToExternalLinks(projectAssets),
        project_assets: toStoredProjectAssets(projectAssets),
        content_blocks: storedBlocks,
        gallery_display_mode: galleryDisplayMode,
        grid_layout: gridLayout,
      };
    },
    [
      tags,
      title,
      shortDescription,
      contentBlocks,
      galleryDisplayMode,
      gridLayout,
      category,
      cover,
      showPrice,
      price,
      allowHire,
      allowCollab,
      studioId,
      creditedIds,
      licenseType,
      licenseNote,
      hasThirdPartyAssets,
      thirdPartyNote,
      aiAssisted,
      aiDisclosureNote,
      clientPermissionConfirmed,
      copyrightHolder,
      rightsAttested,
      allLinkedPostIds,
      collabAccepted,
      projectContext,
      projectAssets,
    ],
  );

  const runProjectLinkSideEffects = useCallback(
    async (projectId: string) => {
      if (!user) return;
      try {
        const ownIds = await resolveLinkedPostIds(user.id, linkedOwnPosts.map((p) => p.id));
        await syncProjectMentionsOnPosts(projectId, ownIds, user.id);

        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", user.id)
          .maybeSingle();
        const ownerName = prof?.display_name ?? prof?.username ?? "ผู้ใช้";

        const desiredIds = [
          ...collabSelected,
          ...collabPending,
          ...collabAccepted,
        ].map((u) => u.user_id);

        await syncProjectCollabInvites({
          projectId,
          ownerId: user.id,
          ownerName,
          projectTitle: title.trim() || "ผลงาน",
          desiredUserIds: desiredIds,
          acceptedUserIds: collabAccepted.map((u) => u.user_id),
        });

        if (collabSelected.length) {
          const invites = await fetchProjectCollabInvites(projectId);
          const pendingIds = invites
            .filter((i) => i.status === "pending")
            .map((i) => i.invited_user_id);
          setCollabPending(await fetchTaggedUserSummaries(pendingIds));
          setCollabSelected([]);
        }

        await assignProjectToSeries({
          projectId,
          seriesId: seriesId.trim() || null,
        });
        void queryClient.invalidateQueries({ queryKey: ["project-series"] });
        void queryClient.invalidateQueries({ queryKey: ["project-series-public"] });
        void queryClient.invalidateQueries({ queryKey: ["project-series-items"] });
        void queryClient.invalidateQueries({ queryKey: ["project-series-for-project", projectId] });
      } catch (e) {
        if (!isMissingProjectLinkColumnError(e)) {
          toast.error(e instanceof Error ? e.message : "ลิงก์โพสต์/เชิญร่วมงานไม่สำเร็จ");
        }
      }
    },
    [user, linkedOwnPosts, collabSelected, collabPending, collabAccepted, title, seriesId, queryClient],
  );

  const draftStatusForSave = useCallback((): Status => {
    if (editing && existing?.status === "Published") return "Published";
    if (editing && existing?.status === "Private") return "Private";
    return "Draft";
  }, [editing, existing?.status]);

  const persistDraft = useCallback(
    async (projectId?: string | null): Promise<{ id: string } | null> => {
      if (!user) throw new Error("UNAUTHORIZED");
      const media = splitMediaFromBlocks(contentBlocks);
      if (
        !portfolioEditorHasContent({
          title,
          description: shortDescription,
          content_blocks: contentBlocks,
          cover_url: cover,
          gallery_urls: media.gallery_urls,
          video_urls: media.video_urls,
          tools,
          tags,
        })
      ) {
        return null;
      }

      const pid = projectId ?? (editing && id && isUuid(id) ? id : null);
      const payload = {
        ...buildProjectPayload(draftStatusForSave()),
        rights_attested_at: rightsAttested
          ? new Date().toISOString()
          : (existing as { rights_attested_at?: string | null } | undefined)?.rights_attested_at ?? null,
        rights_attestation_version: rightsAttested ? LEGAL_ATTESTATION_VERSION : null,
      };

      if (pid && isUuid(pid)) {
        if (existing && user && existing.owner_id !== user.id && !isAdmin) {
          throw new Error("FORBIDDEN");
        }
        await update.mutateAsync({ id: pid, patch: payload });
        return { id: pid };
      }

      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "Draft");
      if ((count ?? 0) >= limits.draft) {
        throw new Error("DRAFT_FULL");
      }

      const created = await create.mutateAsync({ ...payload, owner_id: user.id });
      navigate(`/portfolio/${created.id}/edit`, { replace: true });
      return { id: created.id };
    },
    [
      user,
      title,
      shortDescription,
      contentBlocks,
      cover,
      tools,
      tags,
      buildProjectPayload,
      draftStatusForSave,
      rightsAttested,
      existing,
      isAdmin,
      editing,
      id,
      update,
      limits.draft,
      create,
      navigate,
    ],
  );

  const openCoverCrop = (file: File) => {
    setCoverCropFile(file);
    setCoverCropOpen(true);
  };

  const handleCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const url = await uploadProjectImage(file, user.id, folderRef.current, tier, {
        skipCompression: true,
      });
      setCover(url);
      setCoverCropFile(null);
      toast.success("อัปโหลดภาพปกสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverPick = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("รองรับเฉพาะ JPG, PNG, WebP");
      return;
    }
    openCoverCrop(file);
  };

  const appendMediaBlocks = useCallback((kind: "image" | "video", urls: string[]) => {
    if (!urls.length) return;
    setContentBlocks((prev) => [...prev, ...urls.map((url) => createMediaBlock(kind, url))]);
  }, []);

  const handleGallery = async (files: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(files).filter((f) => f.type.match(/^image\/(jpeg|png|webp)$/i));
    if (!arr.length) {
      toast.error("รองรับเฉพาะ JPG, PNG, WebP");
      return;
    }
    const maxImages = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;
    const currentImages = countMediaByKind(mediaItemsFromBlocks(contentBlocks), "image");
    const room = Math.max(0, maxImages - currentImages);
    if (room <= 0) {
      toast.error(`อัปโหลดภาพได้สูงสุด ${maxImages} ไฟล์/ผลงาน`);
      return;
    }
    const toUpload = arr.slice(0, room);
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const f of toUpload) {
        const u = await uploadProjectImage(f, user.id, folderRef.current, tier);
        urls.push(u);
      }
      appendMediaBlocks("image", urls);
      if (!cover && urls[0]) {
        setCover(urls[0]);
      }
      toast.success(`อัปโหลด ${urls.length} ภาพสำเร็จ`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSubmit = async (
    publish?: boolean,
    projectIdOverride?: string,
    options?: { rightsAttested?: boolean },
  ) => {
    if (!user) return;
    const targetStatus: Status = publish === undefined ? status : publish ? "Published" : "Draft";
    const resolvedId =
      projectIdOverride ?? (editing && id && isUuid(id) ? id : undefined);
    const attested = options?.rightsAttested ?? rightsAttested;

    const basicsErr = validateProjectBasics({ title, cover_url: cover });
    if (basicsErr) {
      toast.error(basicsErr);
      return;
    }

    if (targetStatus === "Published" && existing?.status !== "Published") {
      const maxPublished = limits.published;
      if (Number.isFinite(maxPublished)) {
        const { count } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "Published");
        if ((count ?? 0) >= maxPublished) {
          toast.error(
            isAplus1SubscriptionsEnabled()
              ? `แพ็ก Free เผยแพร่ได้สูงสุด ${maxPublished} ผลงาน — อัปเกรด Pro เพื่อไม่จำกัด`
              : `เผยแพร่ได้สูงสุด ${maxPublished} ผลงาน — ลบหรือแก้ไขผลงานเก่าก่อน`,
          );
          return;
        }
      }
    }
    if (targetStatus === "Draft" && !editing) {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "Draft");
      if ((count ?? 0) >= limits.draft) {
        toast.error(`Draft เต็มแล้ว (${limits.draft} ชิ้น) — เผยแพร่หรือลบ draft ก่อน`);
        return;
      }
    }

    const rightsAttestedAt = attested ? new Date().toISOString() : null;

    const payload = {
      ...buildProjectPayload(targetStatus),
      rights_attested_at: rightsAttestedAt,
      rights_attestation_version: attested ? LEGAL_ATTESTATION_VERSION : null,
    };

    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    if (targetStatus === "Published" && !shortDescription.trim()) {
      toast.error("กรุณากรอกรายละเอียดแบบย่อ");
      return;
    }
    if (targetStatus === "Published" && !attested) {
      toast.error("กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่");
      return;
    }
    const publishErr = validateProjectPublish(parsed.data);
    if (publishErr) {
      toast.error(publishErr);
      return;
    }

    if (targetStatus === "Published" && attested) {
      try {
        await ensureVerified("ยืนยันสิทธิ์และเผยแพร่ผลงาน");
      } catch {
        return;
      }
    }

    try {
      if (resolvedId) {
        if (existing && user && existing.owner_id !== user.id && !isAdmin) {
          toast.error("คุณไม่มีสิทธิ์แก้ไขผลงานนี้");
          return;
        }
        const savedId = resolvedId;
        await update.mutateAsync({ id: savedId, patch: payload });
        await runProjectLinkSideEffects(savedId);
        toast.success(targetStatus === "Published" ? "เผยแพร่ผลงานแล้ว" : "บันทึกการเปลี่ยนแปลงแล้ว");
        scheduleBackgroundAssetScan(savedId);
        if (
          targetStatus === "Published" &&
          drillMetaRef.current.drill_type === "daily" &&
          isLaunchDesignDrillEnabled()
        ) {
          navigate("/?drill=1");
        } else {
          navigate(`/project/${savedId}`);
        }
      } else {
        const created = await create.mutateAsync({ ...payload, owner_id: user.id });
        await runProjectLinkSideEffects(created.id);
        toast.success(targetStatus === "Published" ? "เผยแพร่ผลงานแล้ว" : "บันทึกฉบับร่างแล้ว");
        scheduleBackgroundAssetScan(created.id);
        if (
          targetStatus === "Published" &&
          drillMetaRef.current.drill_type === "daily" &&
          isLaunchDesignDrillEnabled()
        ) {
          navigate("/?drill=1");
        } else {
          navigate(`/project/${created.id}`);
        }
      }
    } catch (e) {
      toast.error(mapWriteFlowError(e, "บันทึกไม่สำเร็จ"));
    }
  };

  const cats = categories.filter((c) => c !== "Explore");
  const isUploadingMedia = uploadingCover || uploadingGallery || uploadingVideo;
  const isBusy = publishing || savingDraft || isUploadingMedia;
  const canPublish = !!title.trim() && !!cover;
  const publishBlockedReason = !title.trim()
    ? "กรอกชื่องานก่อนเผยแพร่"
    : !cover
      ? "ต้องมีภาพปกก่อนเผยแพร่"
      : undefined;

  const handleSaveDraft = async (silent = false) => {
    const basicsErr = validateProjectBasics({ title, cover_url: cover });
    if (basicsErr) {
      if (!silent) toast.error(basicsErr);
      return;
    }
    setSavingDraft(true);
    try {
      const result = await persistDraft();
      if (result) {
        await runProjectLinkSideEffects(result.id);
        scheduleBackgroundAssetScan(result.id);
        if (!silent) toast.success("บันทึกฉบับร่างแล้ว");
      } else if (!silent) {
        toast.message("ยังไม่มีเนื้อหาให้บันทึก");
      }
    } catch (e) {
      if (!silent) toast.error(mapWriteFlowError(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishClick = () => {
    const basicsErr = validateProjectBasics({ title, cover_url: cover });
    if (basicsErr) {
      toast.error(basicsErr);
      return;
    }
    if (!shortDescription.trim()) {
      toast.error("กรุณากรอกรายละเอียดแบบย่อ");
      return;
    }
    setPublishAttestChecked(false);
    setPublishConfirmOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!publishAttestChecked) {
      toast.error("กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่");
      return;
    }
    setRightsAttested(true);
    setPublishConfirmOpen(false);
    setPublishing(true);
    try {
      await handleSubmit(true, editing && id && isUuid(id) ? id : undefined, {
        rightsAttested: true,
      });
    } finally {
      setPublishing(false);
    }
  };

  const applyCanvasTemplate = useCallback(
    (template: UserCanvasTemplate, mode: "replace" | "append") => {
      const added = buildBlocks(template);
      if (!added.length) return;

      setContentBlocks((prev) => (mode === "replace" ? added : [...prev, ...added]));

      const firstGrid = added.find((b) => b.type === "image" && b.mediaLayout === "grid");
      const firstGallery = added.find((b) => b.type === "image" && b.mediaLayout === "gallery");
      if (firstGrid?.gridLayout) {
        setGridLayout(parsePhotoGridPickerLayout(firstGrid.gridLayout));
        setGalleryDisplayMode("grid");
      } else if (firstGallery) {
        setGalleryDisplayMode("gallery");
      } else {
        setGalleryDisplayMode("single");
      }

      if (template.open_context) setContextExpanded(true);
      toast.success(`ใช้เทมเพลต「${template.name}」แล้ว — อัปภาพและแก้ข้อความได้เลย`);
      window.setTimeout(() => titleInputRef.current?.focus(), 80);
    },
    [buildBlocks],
  );

  const handleSelectTemplate = useCallback((templateId: string) => {
    setPreviewTemplateId(templateId);
  }, []);

  const previewTemplate = previewTemplateId
    ? templates.find((t) => t.id === previewTemplateId) ?? null
    : null;

  const handlePlaceTool = useCallback((payload: CanvasToolPayload, insertAt?: number) => {
    if (payload.tool === "grid") {
      setGridLayout(payload.layout);
      setGalleryDisplayMode("grid");
    }
    if (payload.tool === "single" || payload.tool === "gallery") {
      setGalleryDisplayMode(payload.tool);
    }

    setContentBlocks((prev) => {
      let added: ProjectContentBlock[] = [];
      if (payload.tool === "heading" || payload.tool === "heading_body" || payload.tool === "body") {
        added = [createContentBlock(payload.tool)];
      } else if (payload.tool === "video") {
        added = [createMediaPlaceholder("video")];
      } else if (payload.tool === "single") {
        added = [createMediaPlaceholder("image")];
      } else if (payload.tool === "gallery") {
        added = [createGalleryPlaceholder(2)];
      } else if (payload.tool === "multi") {
        added = [createMultiRowPlaceholder(payload.columns)];
      } else if (payload.tool === "image_text") {
        added = [createImageTextPlaceholder(payload.side)];
      } else if (payload.tool === "grid") {
        added = [createGridPlaceholder(payload.layout, photoGridSlotCount(payload.layout))];
      }

      if (!added.length) return prev;

      const at =
        typeof insertAt === "number" && insertAt >= 0 && insertAt <= prev.length
          ? insertAt
          : prev.length;
      return [...prev.slice(0, at), ...added, ...prev.slice(at)];
    });
  }, []);

  const handleUploadToBlock = useCallback(
    async (blockId: string, file: File, slotIndex?: number) => {
      if (!user) return;
      const block = contentBlocks.find((b) => b.id === blockId);
      if (!block || (block.type !== "image" && block.type !== "video" && block.type !== "image_text")) return;

      if (block.type === "image_text") {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
          toast.error("รองรับเฉพาะ JPG, PNG, WebP");
          return;
        }
        setUploadingBlockId(blockId);
        setUploadingGallery(true);
        try {
          const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
          setContentBlocks((prev) =>
            prev.map((b) => (b.id === blockId && b.type === "image_text" ? { ...b, url } : b)),
          );
          if (!cover) setCover(url);
          toast.success("อัปโหลดภาพสำเร็จ");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
        } finally {
          setUploadingBlockId(null);
          setUploadingGallery(false);
        }
        return;
      }

      if (block.type === "image") {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
          toast.error("รองรับเฉพาะ JPG, PNG, WebP");
          return;
        }
        setUploadingBlockId(blockId);
        setUploadingGallery(true);
        try {
          let uploadFile = file;
          let resolvedSlot = typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : undefined;
          if (block.mediaLayout === "grid" && isThreeSplitGridLayout(block.gridLayout)) {
            if (resolvedSlot === undefined) {
              const urls = blockImageUrls(block);
              const next = [...(urls.length ? urls : ["", "", ""])];
              const empty = next.findIndex((u) => !u.trim());
              resolvedSlot = empty >= 0 ? empty : Math.min(next.length, 2);
            }
            const spec = threeSplitSlotCropSpec(resolvedSlot);
            uploadFile = await cropImageFileToAspectFile(file, spec.ratio, file.type || "image/jpeg", {
              width: spec.exportW,
              height: spec.exportH,
            });
          }
          const url = await uploadProjectImage(uploadFile, user.id, folderRef.current, tier);
          setContentBlocks((prev) =>
            prev.map((b) => {
              if (b.id !== blockId || b.type !== "image") return b;
              const urls = blockImageUrls(b);
              if (b.mediaLayout === "gallery") {
                const filled = urls.map((u) => u.trim()).filter(Boolean);
                if (typeof slotIndex === "number" && slotIndex >= 0 && slotIndex < filled.length) {
                  const next = [...filled];
                  next[slotIndex] = url;
                  return { ...b, mediaLayout: "gallery", urls: next, url: next[0] ?? url };
                }
                const next = [...filled, url];
                return { ...b, mediaLayout: "gallery", urls: next, url: next[0] ?? url };
              }
              const multi =
                b.mediaLayout === "grid" ||
                b.mediaLayout === "multi" ||
                urls.length > 1;
              if (multi) {
                const next = [...(urls.length ? urls : ["", ""])];
                const idx =
                  typeof resolvedSlot === "number"
                    ? resolvedSlot
                    : typeof slotIndex === "number" && slotIndex >= 0
                      ? slotIndex
                      : next.findIndex((u) => !u.trim());
                const target = idx >= 0 ? idx : next.length;
                while (next.length <= target) next.push("");
                next[target] = url;
                return {
                  ...b,
                  urls: next,
                  url: next.find((u) => u.trim()) ?? url,
                };
              }
              return { ...b, type: "image", url, mediaLayout: "single" };
            }),
          );
          if (!cover) setCover(url);
          toast.success("อัปโหลดภาพสำเร็จ");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
        } finally {
          setUploadingBlockId(null);
          setUploadingGallery(false);
        }
        return;
      }

      if (
        !(block.url ?? "").trim() &&
        countMediaByKind(mediaItemsFromBlocks(contentBlocks), "video") >= limits.videosPerProject
      ) {
        toast.error(`แพ็กเกจนี้อัปโหลดวิดีโอได้สูงสุด ${limits.videosPerProject} คลิป/ผลงาน`);
        return;
      }
      setUploadingBlockId(blockId);
      setUploadingVideo(true);
      try {
        const url = await uploadProjectVideo(file, user.id, folderRef.current, tier);
        setContentBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, type: "video", url } : b)),
        );
        toast.success("อัปโหลดวิดีโอสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      } finally {
        setUploadingBlockId(null);
        setUploadingVideo(false);
      }
    },
    [user, contentBlocks, cover, tier, limits.videosPerProject],
  );

  const handleUploadManyToBlock = useCallback(
    async (blockId: string, files: File[]) => {
      if (!user || !files.length) return;
      const block = contentBlocks.find((b) => b.id === blockId);
      if (!block || block.type !== "image" || block.mediaLayout !== "gallery") return;

      const images = files.filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type));
      if (!images.length) {
        toast.error("รองรับเฉพาะ JPG, PNG, WebP");
        return;
      }

      setUploadingBlockId(blockId);
      setUploadingGallery(true);
      try {
        const uploaded: string[] = [];
        for (const file of images) {
          const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
          uploaded.push(url);
        }
        setContentBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== blockId || b.type !== "image") return b;
            const existing = blockImageUrls(b).map((u) => u.trim()).filter(Boolean);
            const next = [...existing, ...uploaded];
            return {
              ...b,
              mediaLayout: "gallery",
              urls: next,
              url: next[0] ?? "",
            };
          }),
        );
        if (!cover && uploaded[0]) setCover(uploaded[0]);
        toast.success(uploaded.length > 1 ? `อัปโหลด ${uploaded.length} ภาพสำเร็จ` : "อัปโหลดภาพสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      } finally {
        setUploadingBlockId(null);
        setUploadingGallery(false);
      }
    },
    [user, contentBlocks, cover, tier],
  );

  const handleCropImage = useCallback(async (blockId: string, imageUrl: string, slotIndex?: number) => {
    try {
      const block = contentBlocks.find((b) => b.id === blockId);
      const gallerySlide =
        block?.type === "image" &&
        block.mediaLayout === "gallery" &&
        blockImageUrls(block).map((u) => u.trim()).filter(Boolean).length >= 2;
      const lockedCrop =
        block?.type === "image" &&
        block.mediaLayout === "grid" &&
        isThreeSplitGridLayout(block.gridLayout)
          ? (() => {
              const slot = typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : 0;
              const spec = threeSplitSlotCropSpec(slot);
              return {
                ratio: spec.ratio,
                exportW: spec.exportW,
                exportH: spec.exportH,
                label: slot === 0 ? "1:2" : "1:1",
              };
            })()
          : undefined;
      const file = await urlToImageFile(imageUrl);
      setModuleCropTarget({ blockId, slotIndex, sourceUrl: imageUrl, gallerySlide, lockedCrop });
      setModuleCropFile(file);
      setModuleCropOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดรูปเพื่อครอบไม่สำเร็จ");
    }
  }, [contentBlocks]);

  const handleModuleCropConfirm = useCallback(
    async (result: ModuleImageCropConfirmResult) => {
      if (!user || !moduleCropTarget) return;
      const { file, applyToAll, aspect, cornerRadiusPercent } = result;
      const { blockId, slotIndex, sourceUrl, gallerySlide } = moduleCropTarget;
      setUploadingBlockId(blockId);
      setUploadingGallery(true);
      try {
        if (applyToAll && gallerySlide) {
          const block = contentBlocks.find((b) => b.id === blockId);
          if (!block || block.type !== "image") throw new Error("ไม่พบโมดูลสไลด์");
          const urls = blockImageUrls(block).map((u) => u.trim()).filter(Boolean);
          if (urls.length < 2) throw new Error("ต้องมีอย่างน้อย 2 ภาพในสไลด์");

          const meta = communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect));
          const primaryIndex =
            typeof slotIndex === "number" && slotIndex >= 0 && slotIndex < urls.length
              ? slotIndex
              : Math.max(0, urls.findIndex((u) => u === sourceUrl));

          const next: string[] = [];
          for (let i = 0; i < urls.length; i++) {
            let uploadFile = file;
            if (i !== primaryIndex) {
              const sourceFile = await urlToImageFile(urls[i]);
              const objectUrl = URL.createObjectURL(sourceFile);
              try {
                uploadFile = await cropImageUrlToAspectFile(
                  objectUrl,
                  meta.ratio,
                  `slide-${i + 1}.png`,
                  "image/png",
                  {
                    width: meta.exportW,
                    height: meta.exportH,
                    cornerRadiusPercent,
                  },
                );
              } finally {
                URL.revokeObjectURL(objectUrl);
              }
            }
            const url = await uploadProjectImage(uploadFile, user.id, folderRef.current, tier, {
              skipCompression: true,
            });
            next.push(url);
          }

          setContentBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId && b.type === "image"
                ? { ...b, mediaLayout: "gallery", urls: next, url: next[0] ?? "" }
                : b,
            ),
          );
          if (!cover && next[0]) setCover(next[0]);
          toast.success(`ครอบภาพทั้งสไลด์สำเร็จ (${next.length} ภาพ)`);
          return;
        }

        const url = await uploadProjectImage(file, user.id, folderRef.current, tier, {
          skipCompression: true,
        });
        setContentBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== blockId) return b;
            if (b.type === "image_text") {
              return { ...b, url };
            }
            if (b.type !== "image") return b;
            const urls = blockImageUrls(b).map((u) => u.trim());
            if (
              b.mediaLayout === "single" ||
              (!b.mediaLayout && urls.filter(Boolean).length <= 1 && typeof slotIndex !== "number")
            ) {
              return { ...b, type: "image", url, mediaLayout: b.mediaLayout ?? "single" };
            }
            const next = urls.length ? [...urls] : [sourceUrl];
            if (typeof slotIndex === "number" && slotIndex >= 0) {
              while (next.length <= slotIndex) next.push("");
              next[slotIndex] = url;
            } else {
              const idx = next.findIndex((u) => u === sourceUrl);
              if (idx >= 0) next[idx] = url;
              else next.push(url);
            }
            return {
              ...b,
              urls: next,
              url: next.find((u) => u.trim()) ?? url,
            };
          }),
        );
        toast.success("ครอบภาพสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "บันทึกภาพที่ครอบไม่สำเร็จ");
      } finally {
        setUploadingBlockId(null);
        setUploadingGallery(false);
        setModuleCropFile(null);
        setModuleCropTarget(null);
        setModuleCropOpen(false);
      }
    },
    [user, moduleCropTarget, tier, contentBlocks, cover],
  );

  const mediaItems = useMemo(() => mediaItemsFromBlocks(contentBlocks), [contentBlocks]);

  const previewData: ProjectPreviewData = {
    title,
    description: shortDescription,
    contentBlocks: toStoredContentBlocks(contentBlocks),
    galleryDisplayMode,
    gridLayout,
    category,
    cover,
    gallery: mediaItems.map((m) => m.url),
    tools,
    tags,
    price: showPrice && price ? `฿${Number(price).toLocaleString("th-TH")}` : undefined,
    allowHire,
    allowCollab,
    licenseType,
    licenseNote,
    copyrightHolder,
    hasThirdPartyAssets,
    thirdPartyNote,
    aiAssisted,
    aiDisclosureNote,
    clientPermissionConfirmed,
    context: {
      brief: projectContext.brief,
      creator_role: projectContext.creatorRole,
      process_note: projectContext.processNote,
      deliverables: projectContext.deliverables,
      duration_label: projectContext.durationLabel,
      outcome_note: projectContext.outcomeNote,
    },
  };

  if (editing && id && !isUuid(id)) {
    return (
      <div className="min-h-screen bg-app-ambient flex flex-col items-center justify-center px-4 text-center gap-3">
        <p className="font-medium text-foreground">ไม่พบผลงานนี้</p>
        <p className="text-sm text-muted-foreground">รหัสผลงานไม่ถูกต้อง</p>
        <Button variant="outline" onClick={() => navigate("/portfolio/manage")}>
          กลับจัดการผลงาน
        </Button>
      </div>
    );
  }

  if (editing && (authLoading || projectLoading)) {
    return <PageLoader className="bg-app-ambient" />;
  }

  if (editing && projectError) {
    return (
      <div className="min-h-screen bg-app-ambient flex flex-col items-center justify-center px-4 text-center gap-3">
        <p className="font-medium text-foreground">โหลดผลงานไม่สำเร็จ</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refetchProject()}>
            ลองใหม่
          </Button>
          <Button variant="ghost" onClick={() => navigate("/portfolio/manage")}>
            กลับจัดการผลงาน
          </Button>
        </div>
      </div>
    );
  }

  if (editing && !projectLoading && !existing) {
    return (
      <div className="min-h-screen bg-app-ambient flex flex-col items-center justify-center px-4 text-center gap-3">
        <p className="font-medium text-foreground">ไม่พบผลงานนี้</p>
        <p className="text-sm text-muted-foreground">ผลงานอาจถูกลบแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง</p>
        <Button variant="outline" onClick={() => navigate("/portfolio/manage")}>
          กลับจัดการผลงาน
        </Button>
      </div>
    );
  }

  if (editing && existing && user && existing.owner_id !== user.id && !isAdmin) {
    return (
      <div className="min-h-screen bg-app-ambient flex flex-col items-center justify-center px-4 text-center gap-3">
        <p className="font-medium text-foreground">ไม่มีสิทธิ์แก้ไขผลงานนี้</p>
        <p className="text-sm text-muted-foreground">เฉพาะเจ้าของผลงานเท่านั้นที่แก้ไขได้</p>
        <Button variant="outline" onClick={() => navigate("/portfolio/manage")}>
          กลับจัดการผลงาน
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground truncate">{editing ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่"}</h1>
            {isUploadingMedia && (
              <p className="text-[11px] text-muted-foreground lg:hidden">กำลังอัปโหลดไฟล์…</p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0 lg:hidden"
            onClick={() => {
              setPreviewMode("mobile");
              setPreviewOpen(true);
            }}
            title="พรีวิวมือถือ"
            aria-label="พรีวิวมือถือ"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => {
                setPreviewMode("pc");
                setPreviewOpen(true);
              }}
              title="พรีวิวผลงาน"
              aria-label="พรีวิวผลงาน"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSaveDraft(true)}
              disabled={isBusy}
              className="rounded-full"
            >
              {savingDraft ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              บันทึกฉบับร่าง
            </Button>
            <Button
              size="sm"
              onClick={handlePublishClick}
              disabled={isBusy || !canPublish}
              title={publishBlockedReason}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              เผยแพร่
            </Button>
          </div>
        </div>
      </div>

      {isDrillPost ? (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <DrillPostNotice daily={isDailyDrillPost} />
        </div>
      ) : null}

      <div className="flex w-full flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1">
        <ProjectEditorToolsSidebar
          galleryDisplayMode={galleryDisplayMode}
          gridLayout={gridLayout}
          onDisplayModeChange={setGalleryDisplayMode}
          onPlaceTool={handlePlaceTool}
          templates={templates}
          templatesLoading={templatesLoading}
          templatesAtLimit={templatesAtLimit}
          canSaveTemplate={contentBlocks.length > 0 && !templatesAtLimit}
          onApplyTemplate={handleSelectTemplate}
          onSaveAsTemplate={() => {
            if (contentBlocks.length === 0) {
              toast.message("จัดโมดูลบนแคนวาสก่อนบันทึกเป็นเทมเพลต");
              return;
            }
            if (templatesAtLimit) {
              toast.message("เทมเพลตเต็มแล้ว — ลบหรืออัปเดตอันเดิม");
              return;
            }
            setTemplateNameDraft("");
            setTemplateNameDialog({ mode: "save" });
          }}
          onRenameTemplate={(template) => {
            setTemplateNameDraft(template.name);
            setTemplateNameDialog({ mode: "rename", template });
          }}
          onUpdateTemplate={(template) => {
            if (contentBlocks.length === 0) {
              toast.message("จัดโมดูลบนแคนวาสก่อนอัปเดตเทมเพลต");
              return;
            }
            setPendingUpdateTemplate(template);
          }}
          onDeleteTemplate={(template) => setPendingDeleteTemplate(template)}
          imageDisabled={uploadingGallery}
          videoDisabled={uploadingVideo}
          textDisabled={isBusy}
          uploadingImage={uploadingGallery}
          uploadingVideo={uploadingVideo}
          expanded={toolsExpanded}
          onExpandedChange={setToolsExpanded}
          toolsTab={toolsTab}
          onToolsTabChange={setToolsTab}
        />

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[min(100%,calc(42rem+3.5rem))] space-y-5 px-3 py-5 pb-28 pl-12 sm:space-y-6 sm:px-4 sm:pl-14 sm:pr-4 lg:pb-6 lg:pl-4">
          {/* Left: canvas — content max-w-2xl; side rail uses the extra gutter */}
          <section className="max-w-2xl space-y-3">
            <ProjectCanvasEditor
              blocks={contentBlocks}
              onChange={setContentBlocks}
              disabled={isBusy}
              uploading={uploadingGallery || uploadingVideo}
              uploadingBlockId={uploadingBlockId}
              onEmptyDropImages={(files) => void handleGallery(files)}
              onStartFromTemplate={() => {
                setToolsExpanded(true);
                setToolsTab("template");
              }}
              onStartFromImage={() => emptyStartImageInputRef.current?.click()}
              onStartFromHeading={() => handlePlaceTool({ tool: "heading" })}
              onPlaceTool={handlePlaceTool}
              onUploadToBlock={(id, file, slot) => void handleUploadToBlock(id, file, slot)}
              onUploadManyToBlock={(id, files) => void handleUploadManyToBlock(id, files)}
              onCropImage={(id, url, slot) => void handleCropImage(id, url, slot)}
              selectedBlockId={selectedBlockId}
              onSelectedBlockIdChange={setSelectedBlockId}
            />
            <input
              ref={emptyStartImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) void handleGallery(files);
                e.target.value = "";
              }}
            />
            {(uploadingGallery || uploadingVideo) && contentBlocks.length > 0 && !uploadingBlockId ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังอัปโหลด...
              </div>
            ) : null}
          </section>

          <div className="max-w-2xl border-t border-border/70 pt-6 space-y-6">
          <ProjectContextEditorFields
            value={projectContext}
            onChange={patchProjectContext}
            shortDescription={shortDescription}
            onShortDescriptionChange={setShortDescription}
            expanded={contextExpanded}
            onExpandedChange={setContextExpanded}
            disabled={isBusy}
          />

          {user ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <LicensePicker
                  value={licenseType}
                  onChange={setLicenseType}
                  licenseNote={licenseNote}
                  onLicenseNoteChange={setLicenseNote}
                />
                <ThirdPartyAssetsToggle
                  enabled={hasThirdPartyAssets}
                  onEnabledChange={setHasThirdPartyAssets}
                  note={thirdPartyNote}
                  onNoteChange={setThirdPartyNote}
                />
                <ClientPermissionConfirm
                  confirmed={clientPermissionConfirmed}
                  onConfirmedChange={setClientPermissionConfirmed}
                  copyrightHolder={copyrightHolder}
                  onCopyrightHolderChange={setCopyrightHolder}
                />
                <AiDisclosureToggle
                  enabled={aiAssisted}
                  onEnabledChange={setAiAssisted}
                  note={aiDisclosureNote}
                  onNoteChange={setAiDisclosureNote}
                />
              </div>
              <ProjectAssetsEditor
                assets={projectAssets}
                onChange={setProjectAssets}
                userId={user.id}
                folder={folderRef.current}
                projectId={editing && id && isUuid(id) ? id : undefined}
                tier={tier}
              />
            </div>
          ) : null}

          {!isAplus1LaunchMinimal() ? (
            <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-4">
              <PortfolioLinkedPostPicker
                userId={user?.id ?? ""}
                selected={linkedOwnPosts}
                onChange={setLinkedOwnPosts}
                readOnlyPosts={linkedCollabPosts}
              />
            </section>
          ) : null}
          </div>
          </div>
        </div>
        </div>

        {/* Right: meta sidebar (docked, collapsible) */}
        <ProjectEditorMetaSidebar expanded={metaExpanded} onExpandedChange={setMetaExpanded}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                ชื่องาน *
              </Label>
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น โลโก้ร้านกาแฟเชียงใหม่ Doi Brew"
                aria-label="ชื่องาน"
                aria-required
                className="text-base font-medium h-11 px-3"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                ภาพปก *
              </Label>
              <CoverDrop
                url={cover}
                loading={uploadingCover}
                onPick={handleCoverPick}
                onClear={() => setCover("")}
                compact
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">หมวดงาน *</Label>
              <ProjectCategoryPicker
                value={category}
                options={cats}
                onChange={setCategory}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">ชุดงาน</Label>
                <Link
                  to="/series"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Library className="h-3 w-3" />
                  จัดการชุด
                </Link>
              </div>
              <ProjectSeriesPicker
                value={seriesId}
                options={mySeries}
                onChange={setSeriesId}
                onCreateNew={() => setSeriesCreateOpen(true)}
                disabled={isBusy}
              />
              {mySeries.length === 0 && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  ยังไม่มีชุดงาน — กดเปิดรายการแล้วเลือก「เพิ่มชุดงานใหม่」ได้เลย
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">การมองเห็น</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft — ฉบับร่าง</SelectItem>
                  <SelectItem value="Published">Published — เผยแพร่</SelectItem>
                  <SelectItem value="Private">Private — ส่วนตัว</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="show-price" className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer">
                  ราคาเริ่มต้นงานนี้ (฿)
                </label>
                <Switch
                  id="show-price"
                  checked={showPrice}
                  onCheckedChange={setShowPrice}
                  className="shrink-0"
                />
              </div>
              {showPrice && (
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="เช่น 3500"
                />
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="allow-hire" className="min-w-0 flex flex-1 items-center gap-2 cursor-pointer">
                  <BriefcaseIcon className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  <p className="text-sm text-foreground">เปิดปุ่ม &quot;สนใจจ้างงาน&quot;</p>
                </label>
                <Switch id="allow-hire" checked={allowHire} onCheckedChange={setAllowHire} className="shrink-0" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="allow-collab" className="min-w-0 flex flex-1 items-center gap-2 cursor-pointer">
                  <Handshake className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  <p className="text-sm text-foreground">เปิดปุ่ม &quot;สนใจคอลแลป&quot;</p>
                </label>
                <Switch id="allow-collab" checked={allowCollab} onCheckedChange={setAllowCollab} className="shrink-0" />
              </div>
              {licenseType === "commercial_license" && !allowHire && (
                <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                  แนะนำเปิดปุ่ม &quot;สนใจจ้างงาน&quot; เพื่อให้ผู้ชมติดต่อซื้อสิทธิ์ได้ง่ายขึ้น
                </p>
              )}
            </div>

            {user && (
              <PortfolioCollabUserPicker
                userId={user.id}
                selected={collabSelected}
                onChange={setCollabSelected}
                acceptedUsers={collabAccepted}
                pendingUsers={collabPending}
              />
            )}

            <div className="space-y-3 pt-2 border-t border-border/60">
              <ToolPicker
                userId={user?.id}
                tools={tools}
                onChange={setTools}
                input={toolInput}
                setInput={setToolInput}
                variant="compact"
              />
              <TagPicker
                userId={user?.id}
                tags={tags}
                onChange={setTags}
                input={tagInput}
                setInput={setTagInput}
                variant="compact"
              />
            </div>
          </div>

          {user && (
            <StudioCreditPicker
              studioId={studioId}
              setStudioId={setStudioId}
              creditedIds={creditedIds}
              setCreditedIds={setCreditedIds}
              ownerId={user.id}
            />
          )}
        </ProjectEditorMetaSidebar>
      </div>

      {/* Mobile sticky actions */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="shrink-0 w-[28%] min-w-[6.5rem] rounded-xl px-2 text-sm"
            onClick={() => void handleSaveDraft()}
            disabled={isBusy}
            aria-busy={savingDraft}
          >
            {savingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-label="กำลังบันทึก" />
            ) : (
              "บันทึกฉบับร่าง"
            )}
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl bg-primary text-primary-foreground"
            onClick={handlePublishClick}
            disabled={isBusy || !canPublish}
            title={publishBlockedReason}
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1 inline" />
                กำลังเผยแพร่…
              </>
            ) : (
              "เผยแพร่"
            )}
          </Button>
        </div>
        {!canPublish && publishBlockedReason && (
          <p className="text-xs text-destructive mt-2 text-center">{publishBlockedReason}</p>
        )}
      </div>

      <ProjectPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={previewData}
        ownerId={user?.id}
        defaultMode={previewMode}
      />

      <Dialog
        open={publishConfirmOpen}
        onOpenChange={(open) => {
          if (publishing) return;
          setPublishConfirmOpen(open);
          if (!open) setPublishAttestChecked(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันก่อนเผยแพร่</DialogTitle>
            <DialogDescription>
              ติ๊กยืนยันสิทธิ์ในผลงาน แล้วกดยืนยันเผยแพร่
            </DialogDescription>
          </DialogHeader>
          <OriginalWorkAttestation
            checked={publishAttestChecked}
            onCheckedChange={setPublishAttestChecked}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={publishing}
              onClick={() => {
                setPublishConfirmOpen(false);
                setPublishAttestChecked(false);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={publishing || !publishAttestChecked}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => void handleConfirmPublish()}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  กำลังเผยแพร่…
                </>
              ) : (
                "ยืนยันเผยแพร่"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortfolioCoverCropDialog
        file={coverCropFile}
        open={coverCropOpen}
        onOpenChange={setCoverCropOpen}
        onConfirm={(file) => void handleCover(file)}
        onCancel={() => {
          setCoverCropFile(null);
          setCoverCropOpen(false);
        }}
      />

      <ModuleImageCropDialog
        file={moduleCropFile}
        open={moduleCropOpen}
        onOpenChange={setModuleCropOpen}
        showApplyToAll={!!moduleCropTarget?.gallerySlide}
        lockedRatio={moduleCropTarget?.lockedCrop?.ratio}
        lockedExport={
          moduleCropTarget?.lockedCrop
            ? {
                width: moduleCropTarget.lockedCrop.exportW,
                height: moduleCropTarget.lockedCrop.exportH,
              }
            : undefined
        }
        lockedRatioLabel={moduleCropTarget?.lockedCrop?.label}
        onConfirm={(result) => void handleModuleCropConfirm(result)}
        onCancel={() => {
          setModuleCropFile(null);
          setModuleCropTarget(null);
          setModuleCropOpen(false);
        }}
      />

      <CanvasTemplatePreviewDialog
        template={previewTemplate}
        canvasHasBlocks={contentBlocks.length > 0}
        open={previewTemplateId !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewTemplateId(null);
        }}
        onConfirm={(mode) => {
          if (!previewTemplate) return;
          const t = previewTemplate;
          setPreviewTemplateId(null);
          applyCanvasTemplate(t, mode);
        }}
      />

      <SeriesFormDialog
        open={seriesCreateOpen}
        onOpenChange={setSeriesCreateOpen}
        onCreated={(id) => setSeriesId(id)}
      />

      <Dialog
        open={templateNameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setTemplateNameDialog(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {templateNameDialog?.mode === "rename" ? "เปลี่ยนชื่อเทมเพลต" : "บันทึกเป็นเทมเพลต"}
            </DialogTitle>
            <DialogDescription>
              {templateNameDialog?.mode === "rename"
                ? "ตั้งชื่อใหม่ให้เทมเพลตนี้"
                : "เก็บเฉพาะโครงโมดูล (ไม่เก็บรูป/ข้อความจริง) — สูงสุด 5 อัน"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name-input">ชื่อเทมเพลต</Label>
            <Input
              id="template-name-input"
              value={templateNameDraft}
              onChange={(e) => setTemplateNameDraft(e.target.value)}
              placeholder="เช่น เคสแบรนด์สั้น"
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit?.();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setTemplateNameDialog(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={!templateNameDraft.trim() || createFromBlocks.isPending || renameTemplate.isPending}
              onClick={() => {
                const name = templateNameDraft.trim();
                if (!name || !templateNameDialog) return;
                if (templateNameDialog.mode === "save") {
                  createFromBlocks.mutate(
                    { name, blocks: contentBlocks, openContext: contextExpanded },
                    { onSuccess: () => setTemplateNameDialog(null) },
                  );
                  return;
                }
                renameTemplate.mutate(
                  { id: templateNameDialog.template.id, name },
                  { onSuccess: () => setTemplateNameDialog(null) },
                );
              }}
            >
              {templateNameDialog?.mode === "rename" ? "บันทึกชื่อ" : "บันทึกเทมเพลต"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingUpdateTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingUpdateTemplate(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>อัปเดตเทมเพลต</DialogTitle>
            <DialogDescription>
              แทนที่โครงของ「{pendingUpdateTemplate?.name ?? ""}」ด้วยโมดูลบนแคนวาสปัจจุบัน
              (ไม่เก็บรูป/ข้อความจริง)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setPendingUpdateTemplate(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={updateModulesFromBlocks.isPending || contentBlocks.length === 0}
              onClick={() => {
                if (!pendingUpdateTemplate) return;
                updateModulesFromBlocks.mutate(
                  {
                    id: pendingUpdateTemplate.id,
                    blocks: contentBlocks,
                    openContext: contextExpanded,
                  },
                  { onSuccess: () => setPendingUpdateTemplate(null) },
                );
              }}
            >
              อัปเดตโครง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTemplate(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบเทมเพลต</DialogTitle>
            <DialogDescription>
              ลบ「{pendingDeleteTemplate?.name ?? ""}」ออกจากรายการของคุณ? กู้คืนไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setPendingDeleteTemplate(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeTemplate.isPending}
              onClick={() => {
                if (!pendingDeleteTemplate) return;
                removeTemplate.mutate(pendingDeleteTemplate.id, {
                  onSuccess: () => setPendingDeleteTemplate(null),
                });
              }}
            >
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

/* ---------- subcomponents ---------- */

const CoverDrop = ({
  url,
  loading,
  onPick,
  onClear,
  compact = false,
}: {
  url: string;
  loading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  compact?: boolean;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pickFile = (file: File | undefined) => {
    if (file) onPick(file);
  };

  if (url) {
    return (
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border border-border bg-muted",
          compact ? "aspect-[4/3]" : "aspect-[4/3] rounded-2xl",
        )}
      >
        <img src={url} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className={cn(
            "absolute right-2 top-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100",
            compact && "flex-col sm:flex-row",
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn("rounded-full", compact && "h-8 px-2 text-xs")}
            disabled={loading}
            onClick={() => ref.current?.click()}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1" />}
            เปลี่ยน
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className={cn("rounded-full", compact && "h-8 px-2 text-xs")}
            onClick={onClear}
          >
            <X className="w-3.5 h-3.5 mr-1" /> ลบ
          </Button>
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        pickFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => ref.current?.click()}
      aria-label="ภาพปก"
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition glass-panel",
        compact ? "aspect-[4/3] px-3 py-4" : "min-h-[200px] gap-3 rounded-2xl",
        drag
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
          : "border-border/80 hover:border-primary/40 hover:bg-muted/20",
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
      ) : (
        <ImagePlus className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")} />
      )}
      <p className={cn("text-center font-medium text-foreground", compact ? "text-xs leading-snug" : "text-sm")}>
        อัปโหลดภาพหน้าปก *
      </p>
      {!compact ? (
        <p className="text-xs text-muted-foreground">JPG / PNG / WebP — สูงสุด 30MB · ครอปเป็น 4:3 แนวนอน</p>
      ) : null}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
    </div>
  );
};


export default ProjectEditorPage;

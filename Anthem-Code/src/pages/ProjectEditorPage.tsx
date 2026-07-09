import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Handshake, ImagePlus, Loader2, Save, Upload, X } from "lucide-react";
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
import { isUuid } from "@/lib/uuid";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { getProjectLimits } from "@/lib/projectLimits";
import { supabase } from "@/integrations/supabase/client";
import { projectSchema, validateProjectPublish } from "@/lib/validators";
import { portfolioEditorHasContent } from "@/lib/portfolioEditorStorage";
import { categories, DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import StudioCreditPicker from "@/components/profile/StudioCreditPicker";
import LicensePicker from "@/components/license/LicensePicker";
import TagPicker from "@/components/tags/TagPicker";
import ToolPicker from "@/components/tools/ToolPicker";
import ProjectPreviewDialog, { type ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";
import { PortfolioCoverCropDialog } from "@/components/project/PortfolioCoverCropDialog";
import { PROJECT_COVER_RATIO_LABEL } from "@/lib/projectCoverAspect";
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
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { type LicenseType, isLicenseType } from "@/lib/licenses";
import { ProjectEditorToolsSidebar } from "@/components/project/ProjectEditorToolsSidebar";
import { ProjectEditorGallerySection } from "@/components/project/ProjectEditorGallerySection";
import { PortfolioLinkedPostPicker } from "@/components/project/PortfolioLinkedPostPicker";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { PortfolioCollabUserPicker } from "@/components/project/PortfolioCollabUserPicker";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
import { ProjectContentBlocksEditor } from "@/components/project/ProjectContentBlocksEditor";
import {
  blocksFromLegacyDescription,
  createContentBlock,
  parseContentBlocks,
  parseGalleryDisplayMode,
  PROJECT_CONTENT_BLOCKS_MAX,
  gallerySectionTitle,
  toStoredContentBlocks,
  type GalleryDisplayMode,
  type ProjectContentBlock,
  type ProjectContentBlockType,
} from "@/lib/projectContentBlocks";
import { parsePhotoGridLayout, photoGridSlotCount, type PhotoGridLayout } from "@/lib/photoGridLayouts";
import {
  countMediaByKind,
  mediaItemFromUrl,
  mediaItemsFromProject,
  splitMediaItems,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
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

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ProjectContentBlock[]>([]);
  const [galleryDisplayMode, setGalleryDisplayMode] = useState<GalleryDisplayMode>("gallery");
  const [gridLayout, setGridLayout] = useState<PhotoGridLayout>("four_quad");
  const [category, setCategory] = useState<string>("");
  const [cover, setCover] = useState<string>("");
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("");
  const [showPrice, setShowPrice] = useState(false);
  const [status, setStatus] = useState<Status>("Draft");
  const [allowHire, setAllowHire] = useState(true);
  const [allowCollab, setAllowCollab] = useState(true);
  const [studioId, setStudioId] = useState<string | null>(null);
  const [creditedIds, setCreditedIds] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState<LicenseType>("all_rights");
  const [licenseNote, setLicenseNote] = useState("");
  const [copyrightHolder, setCopyrightHolder] = useState("");
  const [hasThirdPartyAssets, setHasThirdPartyAssets] = useState(false);
  const [thirdPartyNote, setThirdPartyNote] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const [toolInput, setToolInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingGridSlot, setUploadingGridSlot] = useState<number | null>(null);
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
    if (!existing) return;
    if (editing && user && existing.owner_id !== user.id && !isAdmin) return;
    setTitle(existing.title);
      const extContent = existing as {
        content_blocks?: unknown;
        gallery_display_mode?: string;
        grid_layout?: string;
      };
      const parsedBlocks = parseContentBlocks(extContent.content_blocks);
      if (parsedBlocks.length) {
        setContentBlocks(parsedBlocks);
        setShortDescription(existing.description ?? "");
      } else {
        setContentBlocks(blocksFromLegacyDescription(existing.description));
        setShortDescription("");
      }
      setGalleryDisplayMode(parseGalleryDisplayMode(extContent.gallery_display_mode));
      setGridLayout(parsePhotoGridLayout(extContent.grid_layout));
      setCategory(existing.category);
      setCover(existing.cover_url ?? "");
      setMediaItems(
        mediaItemsFromProject(
          existing.gallery_urls ?? [],
          ((existing as { video_urls?: string[] }).video_urls) ?? [],
        ),
      );
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
      setContextExpanded(hasProjectContextContent(extCtx));
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
      const { gallery_urls, video_urls } = splitMediaItems(mediaItems);
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
        copyright_holder: copyrightHolder.trim(),
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
      mediaItems,
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
      } catch (e) {
        if (!isMissingProjectLinkColumnError(e)) {
          toast.error(e instanceof Error ? e.message : "ลิงก์โพสต์/เชิญร่วมงานไม่สำเร็จ");
        }
      }
    },
    [user, linkedOwnPosts, collabSelected, collabPending, collabAccepted, title],
  );

  const draftStatusForSave = useCallback((): Status => {
    if (editing && existing?.status === "Published") return "Published";
    if (editing && existing?.status === "Private") return "Private";
    return "Draft";
  }, [editing, existing?.status]);

  const persistDraft = useCallback(
    async (projectId?: string | null): Promise<{ id: string } | null> => {
      if (!user) throw new Error("UNAUTHORIZED");
      const media = splitMediaItems(mediaItems);
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
      mediaItems,
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

  const handleSetCoverFromGallery = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not image");
      const file = new File([blob], "gallery-cover.webp", { type: blob.type || "image/webp" });
      openCoverCrop(file);
    } catch {
      toast.error("โหลดรูปไม่สำเร็จ — ลองอัปโหลดภาพปกใหม่");
    }
  };

  const handleGallery = async (files: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(files);
    const maxGallery = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;
    const imageCount = countMediaByKind(mediaItems, "image");
    if (imageCount + arr.length > maxGallery) {
      toast.error(`รวมแล้วต้องไม่เกิน ${maxGallery} ภาพ`);
      return;
    }
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const f of arr) {
        const u = await uploadProjectImage(f, user.id, folderRef.current, tier);
        urls.push(u);
      }
      const added = urls.map(mediaItemFromUrl);
      setMediaItems((prev) => [...prev, ...added]);
      toast.success(`อัปโหลด ${urls.length} ภาพสำเร็จ`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleGridSlotUpload = async (slotIndex: number, file: File) => {
    if (!user) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      toast.error("รองรับเฉพาะ JPG, PNG, WebP");
      return;
    }
    const maxGalleryNum = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;
    const images = mediaItems.filter((m) => m.kind === "image");
    const slots = photoGridSlotCount(gridLayout);
    if (slotIndex >= slots) return;

    if (slotIndex > images.length) {
      toast.error("กรุณาเติมช่องก่อนหน้าก่อน");
      return;
    }
    if (slotIndex === images.length && images.length >= maxGalleryNum) {
      toast.error(`รวมแล้วต้องไม่เกิน ${maxGalleryNum} ภาพ`);
      return;
    }

    setUploadingGridSlot(slotIndex);
    try {
      const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
      const newItem = mediaItemFromUrl(url);
      setMediaItems((prev) => {
        const imgs = prev.filter((m) => m.kind === "image");
        const vids = prev.filter((m) => m.kind === "video");
        const nextImgs = [...imgs];
        if (slotIndex < nextImgs.length) {
          nextImgs[slotIndex] = newItem;
        } else {
          nextImgs.push(newItem);
        }
        return [...nextImgs, ...vids];
      });
      toast.success("อัปโหลดภาพสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingGridSlot(null);
    }
  };

  const handleGridSlotRemove = (slotIndex: number) => {
    setMediaItems((prev) => {
      const images = prev.filter((m) => m.kind === "image");
      const videos = prev.filter((m) => m.kind === "video");
      if (slotIndex >= images.length) return prev;
      const removed = images[slotIndex];
      const nextImages = images.filter((_, i) => i !== slotIndex);
      if (removed?.url === cover) {
        const nextCover = nextImages[0]?.url ?? "";
        setCover(nextCover);
      }
      return [...nextImages, ...videos];
    });
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, j) => j !== index);
      if (removed?.kind === "image" && removed.url === cover) {
        const nextCover = next.find((m) => m.kind === "image")?.url ?? "";
        setCover(nextCover);
      }
      return next;
    });
  };


  const handleVideo = async (file: File) => {
    if (!user) return;
    if (countMediaByKind(mediaItems, "video") >= limits.videosPerProject) {
      toast.error(`แพ็กเกจนี้อัปโหลดวิดีโอได้สูงสุด ${limits.videosPerProject} คลิป/ผลงาน`);
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await uploadProjectVideo(file, user.id, folderRef.current, tier);
      setMediaItems((prev) => [...prev, mediaItemFromUrl(url)]);
      toast.success("อัปโหลดวิดีโอสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (publish?: boolean, projectIdOverride?: string) => {
    if (!user) return;
    const targetStatus: Status = publish === undefined ? status : publish ? "Published" : "Draft";
    const resolvedId =
      projectIdOverride ?? (editing && id && isUuid(id) ? id : undefined);

    if (targetStatus === "Published" && existing?.status !== "Published") {
      const maxPublished = limits.published;
      if (Number.isFinite(maxPublished)) {
        const { count } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "Published");
        if ((count ?? 0) >= maxPublished) {
          toast.error(`แพ็ก Free เผยแพร่ได้สูงสุด ${maxPublished} ผลงาน — อัปเกรด Pro เพื่อไม่จำกัด`);
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

    const rightsAttestedAt = rightsAttested ? new Date().toISOString() : null;

    const payload = {
      ...buildProjectPayload(targetStatus),
      rights_attested_at: rightsAttestedAt,
      rights_attestation_version: rightsAttested ? LEGAL_ATTESTATION_VERSION : null,
    };

    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    if (targetStatus === "Published" && !cover) {
      toast.error("ต้องมีภาพปกก่อนเผยแพร่");
      return;
    }
    if (targetStatus === "Published" && !rightsAttested) {
      toast.error("กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่");
      return;
    }
    const publishErr = validateProjectPublish(parsed.data);
    if (publishErr) {
      toast.error(publishErr);
      return;
    }

    if (targetStatus === "Published" && rightsAttested) {
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
          drillMetaRef.current.drill_type === "daily"
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
          drillMetaRef.current.drill_type === "daily"
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
  const isUploadingMedia = uploadingCover || uploadingGallery || uploadingVideo || uploadingGridSlot !== null;
  const isBusy = publishing || savingDraft || isUploadingMedia;
  const canPublish = !!cover && rightsAttested;
  const publishBlockedReason = !cover
    ? "ต้องมีภาพปกก่อนเผยแพร่"
    : !rightsAttested
      ? "กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่"
      : undefined;

  const handleSaveDraft = async (silent = false) => {
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

  const handlePublishClick = async () => {
    setPublishing(true);
    try {
      await handleSubmit(true, editing && id && isUuid(id) ? id : undefined);
    } finally {
      setPublishing(false);
    }
  };

  const handleGalleryDisplayModeChange = (mode: GalleryDisplayMode) => {
    if (mode === "single") {
      const images = mediaItems.filter((m) => m.kind === "image");
      if (images.length > 1) {
        const keepId = images[0]!.id;
        setMediaItems((prev) => prev.filter((m) => m.kind !== "image" || m.id === keepId));
        toast.message("โหมดภาพเดียว — คงภาพแรกไว้");
      }
    }
    setGalleryDisplayMode(mode);
  };

  const handleGridLayoutSelect = (layout: PhotoGridLayout) => {
    setGridLayout(layout);
    handleGalleryDisplayModeChange("grid");
  };

  const handleAddTextBlock = useCallback(
    (type: ProjectContentBlockType) => {
      if (contentBlocks.length >= PROJECT_CONTENT_BLOCKS_MAX) {
        toast.message(`เพิ่มบล็อกได้สูงสุด ${PROJECT_CONTENT_BLOCKS_MAX} บล็อก`);
        return;
      }
      setContentBlocks((prev) => [...prev, createContentBlock(type)]);
    },
    [contentBlocks.length],
  );

  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const maxGallery =
    galleryDisplayMode === "single"
      ? 1
      : Number.isFinite(limits.galleryImages)
        ? limits.galleryImages
        : 20;

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
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        กำลังโหลด…
      </div>
    );
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
              onClick={() => void handlePublishClick()}
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

      <div className="flex w-full">
        <ProjectEditorToolsSidebar
          galleryDisplayMode={galleryDisplayMode}
          gridLayout={gridLayout}
          onDisplayModeChange={handleGalleryDisplayModeChange}
          onGridLayoutSelect={handleGridLayoutSelect}
          imageCount={imageCount}
          maxImages={maxGallery}
          videoCount={videoCount}
          maxVideos={limits.videosPerProject}
          contentBlocks={contentBlocks}
          imageDisabled={uploadingGallery || uploadingGridSlot !== null || imageCount >= maxGallery}
          videoDisabled={uploadingVideo || videoCount >= limits.videosPerProject}
          textDisabled={isBusy || contentBlocks.length >= PROJECT_CONTENT_BLOCKS_MAX}
          uploadingImage={uploadingGallery || uploadingGridSlot !== null}
          uploadingVideo={uploadingVideo}
          onPickImages={handleGallery}
          onPickVideo={(f) => void handleVideo(f)}
          onAddTextBlock={handleAddTextBlock}
          className="fixed left-0 top-16 z-30 lg:sticky lg:top-16 lg:z-auto lg:self-start"
        />

        <div className="min-w-0 flex-1 pl-12 lg:pl-0">

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: content */}
        <div className="space-y-6 order-2 lg:order-none">
          <section className="space-y-2">
            {!(galleryDisplayMode === "single" && mediaItems.length === 0) ? (
              <Label className="text-sm font-semibold">
                {gallerySectionTitle(galleryDisplayMode)}
              </Label>
            ) : null}

            {galleryDisplayMode === "grid" || mediaItems.length > 0 ? (
              <div className="space-y-3">
                <ProjectEditorGallerySection
                  items={mediaItems}
                  displayMode={galleryDisplayMode}
                  gridLayout={gridLayout}
                  title={title}
                  coverUrl={cover}
                  disabled={isBusy}
                  uploadingGridSlot={uploadingGridSlot}
                  onReorder={setMediaItems}
                  onSetCover={(url) => void handleSetCoverFromGallery(url)}
                  onRemove={removeMediaItem}
                  onGridSlotUpload={(slot, file) => void handleGridSlotUpload(slot, file)}
                  onGridSlotRemove={handleGridSlotRemove}
                />
                {mediaItems.length === 0 && galleryDisplayMode !== "grid" ? (
                  <GalleryDrop
                    loading={uploadingGallery}
                    onPick={handleGallery}
                    displayMode={galleryDisplayMode}
                  />
                ) : null}
                {(uploadingGallery || uploadingVideo) && (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-8 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังอัปโหลด...
                  </div>
                )}
              </div>
            ) : (
              <GalleryDrop
                loading={uploadingGallery}
                onPick={handleGallery}
                displayMode={galleryDisplayMode}
              />
            )}
          </section>

          <div className="space-y-6">
          {/* Content blocks */}
          <ProjectContentBlocksEditor
            blocks={contentBlocks}
            onChange={setContentBlocks}
            disabled={isBusy}
            hideAddButtons
          />

          <ProjectContextEditorFields
            value={projectContext}
            onChange={patchProjectContext}
            expanded={contextExpanded}
            onExpandedChange={setContextExpanded}
          />

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

        {/* Right: sidebar */}
        <aside className="order-first space-y-5 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">ชื่อผลงาน *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น โลโก้ร้านกาแฟเชียงใหม่ Doi Brew"
                className="text-base font-medium h-11 px-3"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">ภาพปก *</Label>
                {!cover ? (
                  <span className="text-[11px] text-primary">ต้องมีภาพปกก่อนเผยแพร่</span>
                ) : null}
              </div>
              <CoverDrop
                url={cover}
                loading={uploadingCover}
                onPick={handleCoverPick}
                onClear={() => setCover("")}
                compact
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                อัตราส่วน {PROJECT_COVER_RATIO_LABEL} แนวนอน — ใช้ในฟีดและการค้นหา
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">หมวดงาน *</Label>
              <Select value={category || undefined} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
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
                  ราคาเริ่มต้น (฿)
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
              <Label className="text-xs font-semibold text-muted-foreground uppercase">ปุ่มติดต่อในผลงานนี้</Label>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="allow-hire" className="min-w-0 flex flex-1 items-start gap-2 cursor-pointer">
                  <BriefcaseIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">ปุ่ม "สนใจจ้างงาน"</p>
                    <p className="text-xs text-muted-foreground">ให้ผู้ชมส่งคำขอจ้างได้</p>
                  </div>
                </label>
                <Switch id="allow-hire" checked={allowHire} onCheckedChange={setAllowHire} className="shrink-0" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="allow-collab" className="min-w-0 flex flex-1 items-start gap-2 cursor-pointer">
                  <Handshake className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">ปุ่ม "สนใจคอลแลป"</p>
                    <p className="text-xs text-muted-foreground">เปิดรับ Collab จากผู้ชม</p>
                  </div>
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
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <LicensePicker
              value={licenseType}
              onChange={setLicenseType}
              licenseNote={licenseNote}
              onLicenseNoteChange={setLicenseNote}
              copyrightHolder={copyrightHolder}
              onCopyrightHolderChange={setCopyrightHolder}
            />
            <ThirdPartyAssetsToggle
              enabled={hasThirdPartyAssets}
              onEnabledChange={setHasThirdPartyAssets}
              note={thirdPartyNote}
              onNoteChange={setThirdPartyNote}
            />
            {status === "Published" && (
              <OriginalWorkAttestation
                checked={rightsAttested}
                onCheckedChange={setRightsAttested}
              />
            )}
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



          {user && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                รายละเอียดแบบย่อ
              </Label>
              <Textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="สรุปสั้น ๆ ว่างานนี้คืออะไร ทำอะไร หรือจุดเด่นที่อยากให้จำ..."
                rows={4}
                maxLength={2000}
                disabled={isBusy}
                className="resize-y min-h-[96px] text-sm"
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {shortDescription.length}/2000
              </p>
            </div>
          )}

          {user && (
            <ProjectAssetsEditor
              assets={projectAssets}
              onChange={setProjectAssets}
              userId={user.id}
              folder={folderRef.current}
              projectId={editing && id && isUuid(id) ? id : undefined}
              tier={tier}
            />
          )}

          <ToolPicker
            userId={user?.id}
            tools={tools}
            onChange={setTools}
            input={toolInput}
            setInput={setToolInput}
          />
          <TagPicker
            userId={user?.id}
            tags={tags}
            onChange={setTags}
            input={tagInput}
            setInput={setTagInput}
          />
        </aside>
      </div>
        </div>
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
            onClick={() => void handlePublishClick()}
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
        ลากภาพมาวาง หรือคลิกเพื่อเลือก
      </p>
      {!compact ? (
        <p className="text-xs text-muted-foreground">JPG / PNG / WebP — สูงสุด 30MB · ครอปเป็น 4:3 แนวนอน</p>
      ) : null}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
    </div>
  );
};

const GalleryDrop = ({
  loading,
  onPick,
  displayMode = "gallery",
}: {
  loading: boolean;
  onPick: (f: FileList) => void;
  displayMode?: GalleryDisplayMode;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const single = displayMode === "single";
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onPick(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer p-12 min-h-[180px] flex flex-col items-center justify-center gap-3 transition glass-panel ${
        drag ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/20"
      }`}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">
        {single ? "ลากภาพมาวาง หรือคลิกเพื่อเลือก" : "ลากภาพหลายไฟล์มาวาง หรือคลิกเพื่อเลือก"}
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={!single}
        hidden
        onChange={(e) => e.target.files && onPick(e.target.files)}
      />
    </div>
  );
};

export default ProjectEditorPage;

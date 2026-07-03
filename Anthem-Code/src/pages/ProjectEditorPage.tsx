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
import { categories } from "@/data/projectTypes";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import StudioCreditPicker from "@/components/profile/StudioCreditPicker";
import LicensePicker from "@/components/license/LicensePicker";
import TagPicker from "@/components/tags/TagPicker";
import ToolPicker from "@/components/tools/ToolPicker";
import ProjectPreviewDialog, { type ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";
import ProjectContextEditorFields, {
  type ProjectContextForm,
} from "@/components/project/ProjectContextEditorFields";
import type { OpportunityTypeKey } from "@/lib/opportunity";
import type { ProjectPreviewMode } from "@/components/project/ProjectPreviewModeTabs";
import ThirdPartyAssetsToggle from "@/components/license/ThirdPartyAssetsToggle";
import OriginalWorkAttestation from "@/components/license/OriginalWorkAttestation";
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { type LicenseType, isLicenseType } from "@/lib/licenses";
import { GalleryMediaButtons } from "@/components/project/GalleryMediaButtons";
import { PortfolioLinkedPostPicker } from "@/components/project/PortfolioLinkedPostPicker";
import { PortfolioCollabUserPicker } from "@/components/project/PortfolioCollabUserPicker";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
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
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Graphic");
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
  const [uploadingGallery, setUploadingGallery] = useState(false);
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
    opportunityNote: "",
    opportunityTypes: [],
  });
  const patchProjectContext = useCallback((patch: Partial<ProjectContextForm>) => {
    setProjectContext((c) => ({ ...c, ...patch }));
  }, []);
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
    if (prefillDesc) setDescription(prefillDesc);
    if (prefillCat && categories.some((c) => c === prefillCat)) setCategory(prefillCat);
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
      setDescription((d) =>
        d.trim()
          ? d
          : `โปรเจกต์สำหรับลูกค้า ${prefillClient} — เสร็จจาก So1o Job Tracker`,
      );
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
      setDescription(existing.description ?? "");
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
        opportunity_types?: string[] | null;
        opportunity_note?: string | null;
      };
      setProjectContext({
        brief: extCtx.brief ?? "",
        creatorRole: extCtx.creator_role ?? "",
        processNote: extCtx.process_note ?? "",
        deliverables: extCtx.deliverables ?? "",
        durationLabel: extCtx.duration_label ?? "",
        outcomeNote: extCtx.outcome_note ?? "",
        opportunityNote: extCtx.opportunity_note ?? "",
        opportunityTypes: (extCtx.opportunity_types ?? []) as OpportunityTypeKey[],
      });
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

      return {
        title: title.trim(),
        subtitle: "",
        description: description.trim(),
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
        opportunity_types: projectContext.opportunityTypes,
        opportunity_note: projectContext.opportunityNote.trim(),
      };
    },
    [
      mediaItems,
      tags,
      title,
      description,
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
          description,
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
      description,
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

  const handleCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
      setCover(url);
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
    void handleCover(file);
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
        await update.mutateAsync({ id: resolvedId, patch: payload });
        await runProjectLinkSideEffects(resolvedId);
        toast.success(targetStatus === "Published" ? "เผยแพร่ผลงานแล้ว" : "บันทึกการเปลี่ยนแปลงแล้ว");
        if (
          targetStatus === "Published" &&
          drillMetaRef.current.drill_type === "daily"
        ) {
          navigate("/?drill=1");
        } else {
          navigate(`/project/${resolvedId}`);
        }
      } else {
        const created = await create.mutateAsync({ ...payload, owner_id: user.id });
        await runProjectLinkSideEffects(created.id);
        toast.success(targetStatus === "Published" ? "เผยแพร่ผลงานแล้ว" : "บันทึกฉบับร่างแล้ว");
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
  const isUploadingMedia = uploadingCover || uploadingGallery || uploadingVideo;
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

  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const maxGallery = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;

  const previewData: ProjectPreviewData = {
    title,
    description,
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

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: content */}
        <div className="space-y-6">
          <section className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-sm font-semibold">ภาพปก *</Label>
              {!cover && (
                <span className="text-xs text-destructive">ต้องมีภาพปกก่อนเผยแพร่</span>
              )}
            </div>
            <CoverDrop
              url={cover}
              loading={uploadingCover}
              onPick={handleCoverPick}
              onClear={() => setCover("")}
            />
            <p className="text-xs text-muted-foreground">ใช้เป็นภาพหลักในฟีดและการค้นหา (จะถูกบีบเป็น WebP คุณภาพ HD)</p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">
                  แกลเลอรีผลงาน ({imageCount}/{maxGallery} ภาพ
                  {limits.videosPerProject > 0 ? `, ${videoCount}/${limits.videosPerProject} วิดีโอ` : ""})
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">ลากเพื่อเรียงลำดับ · วิดีโอสูงสุด ~15MB/คลิป</p>
              </div>
              <GalleryMediaButtons
                imageDisabled={uploadingGallery || imageCount >= maxGallery}
                videoDisabled={uploadingVideo || videoCount >= limits.videosPerProject}
                uploadingImage={uploadingGallery}
                uploadingVideo={uploadingVideo}
                onPickImages={handleGallery}
                onPickVideo={(f) => void handleVideo(f)}
              />
            </div>

            {mediaItems.length === 0 ? (
              <GalleryDrop loading={uploadingGallery} onPick={handleGallery} />
            ) : (
              <div className="space-y-3">
                <SortableGalleryGrid
                  items={mediaItems}
                  coverUrl={cover}
                  onReorder={setMediaItems}
                  onSetCover={setCover}
                  onRemove={removeMediaItem}
                  layout="list"
                />
                {(uploadingGallery || uploadingVideo) && (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-8 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังอัปโหลด...
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="space-y-6">
          {/* Title */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">ชื่อผลงาน *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น โลโก้ร้านกาแฟเชียงใหม่ Doi Brew"
              className="text-2xl font-medium h-14 px-4"
              maxLength={120}
            />
          </section>

          {/* Description */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">รายละเอียด</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`เล่าที่มา แนวคิด กระบวนการ และผลลัพธ์ของงานนี้...\n\nรองรับการเว้นบรรทัดเพื่อให้อ่านง่าย`}
              rows={8}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
          </section>

          <ProjectContextEditorFields
            value={projectContext}
            onChange={patchProjectContext}
            publishMode={status === "Published"}
          />

          <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-4">
            <PortfolioLinkedPostPicker
              userId={user?.id ?? ""}
              selected={linkedOwnPosts}
              onChange={setLinkedOwnPosts}
              readOnlyPosts={linkedCollabPosts}
            />
            <div className="border-t border-border/60 pt-4">
              <PortfolioCollabUserPicker
                userId={user?.id ?? ""}
                selected={collabSelected}
                onChange={setCollabSelected}
                acceptedUsers={collabAccepted}
                pendingUsers={collabPending}
              />
            </div>
          </section>
          </div>
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">หมวดงาน *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

            <div className="space-y-2 pt-2 border-t border-border/60">
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

    </div>
  );
};

/* ---------- subcomponents ---------- */

const CoverDrop = ({
  url,
  loading,
  onPick,
  onClear,
}: {
  url: string;
  loading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pickFile = (file: File | undefined) => {
    if (file) onPick(file);
  };

  if (url) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-border group">
        <img src={url} alt="cover" className="w-full h-auto block" />
        <div className="absolute top-3 right-3 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full"
            disabled={loading}
            onClick={() => ref.current?.click()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
            เปลี่ยนรูป
          </Button>
          <Button type="button" size="sm" variant="destructive" className="rounded-full" onClick={onClear}>
            <X className="w-4 h-4 mr-1" /> ลบภาพปก
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
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition min-h-[200px] flex flex-col items-center justify-center gap-3 glass-panel ${
        drag ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/20"
      }`}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">ลากภาพมาวาง หรือคลิกเพื่อเลือก</p>
      <p className="text-xs text-muted-foreground">JPG / PNG / WebP — สูงสุด 5MB · ใช้ตามอัตราส่วนต้นฉบับ</p>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
    </div>
  );
};

const GalleryDrop = ({ loading, onPick }: { loading: boolean; onPick: (f: FileList) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
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
      <p className="text-sm font-medium text-foreground">ลากภาพหลายไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
      <p className="text-xs text-muted-foreground">เพิ่มได้สูงสุด 20 ภาพ — เรียงลำดับได้ภายหลัง</p>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && onPick(e.target.files)} />
    </div>
  );
};

export default ProjectEditorPage;

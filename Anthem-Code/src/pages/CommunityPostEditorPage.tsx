import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Orbit } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useCommunityDraft,
  useCommunityPost,
  usePublishCommunityPost,
  useSaveCommunityDraft,
  useUpdateCommunityPost,
  isCommunityDraftStillOpen,
} from "@/hooks/useCommunityPosts";
import { useProject } from "@/hooks/useProjects";
import { useCommunityImageUpload } from "@/hooks/useCommunityImageUpload";
import { communityPostDraftSchema, communityPostSchema } from "@/lib/validators";
import { toast } from "sonner";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { CommunityComposerTemplates } from "@/components/community/CommunityComposerTemplates";
import { CommunityLinkPreviewBar } from "@/components/community/CommunityLinkPreviewBar";
import { formatCommunityActionError } from "@/lib/communityRateLimit";
import { extractCommunityLinkUrls } from "@/lib/communityLinkUrls";
import {
  canAddCommunityImage,
  canAddCommunityVideo,
  communityMediaLimitMessage,
  getCommunityMediaLimits,
} from "@/lib/communityLimits";
import {
  countMediaByKind,
  mediaItemFromUrl,
  mediaItemsFromProject,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import { splitCommunityMedia } from "@/lib/communityMedia";
import {
  composerHasContent,
  clearComposerLocal,
  loadComposerLocal,
} from "@/lib/communityComposerStorage";
import { loadCommunityFilter, saveCommunityFilter } from "@/data/communityTopics";
import { titlesMatch, classifyCategory, resolveCommunityCategory } from "@/lib/classifyCommunityPost";
import type { ProjectCategory } from "@/data/projectTypes";
import { CommunityComposerCategoryField } from "@/components/community/CommunityComposerCategoryField";
import {
  fetchMentionedProjectSummaries,
  mentionedProjectIds,
  type MentionedProjectSummary,
} from "@/lib/communityMentionedProjects";
import {
  fetchTaggedUserSummaries,
  taggedUserIds,
  type TaggedUserSummary,
} from "@/lib/communityTaggedUsers";
import CommunityRulesCard from "@/components/community/CommunityRulesCard";
import CommunityProfanityHint from "@/components/community/CommunityProfanityHint";
import { CommunityCaptionMetaInline } from "@/components/community/CommunityCaptionMetaInline";
import { detectProfanityInFields } from "@/lib/profanity";
import { CommunityMediaStrip } from "@/components/community/CommunityMediaStrip";
import { CommunityComposerToolbar } from "@/components/community/CommunityComposerToolbar";
import { CommunityProjectMentionPicker } from "@/components/community/CommunityProjectMentionPicker";
import { CommunityUserTagPicker } from "@/components/community/CommunityUserTagPicker";
import { CommunityPostPreviewDialog } from "@/components/community/CommunityPostPreviewDialog";
import { CommunityPostPreviewPanel } from "@/components/community/CommunityPostPreviewPanel";
import { CommunityComposerFooter } from "@/components/community/CommunityComposerFooter";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { CommunityImageOrderDialog } from "@/components/community/CommunityImageOrderDialog";
import {
  DEFAULT_COMMUNITY_MEDIA_ASPECT,
  type CommunityMediaAspect,
  normalizeCommunityMediaAspect,
} from "@/lib/communityMediaAspect";

function draftDisplayTitle(title: string, body: string) {
  return titlesMatch(title, body) ? "" : title;
}

const CommunityPostEditorPage = () => {
  const navigate = useNavigate();
  const { id: editRouteId } = useParams();
  const [searchParams] = useSearchParams();
  const fromProjectId = searchParams.get("fromProject");
  const isEditMode = Boolean(editRouteId);
  const editPostId = isEditMode ? editRouteId! : null;

  const { user } = useAuth();
  const { tier } = useSubscription();
  const limits = getCommunityMediaLimits();
  const folderRef = useRef(`community-${crypto.randomUUID()}`);
  const publish = usePublishCommunityPost();
  const updatePost = useUpdateCommunityPost();
  const saveDraft = useSaveCommunityDraft();
  const { data: existingDraft, isLoading: draftLoading } = useCommunityDraft(
    isEditMode ? undefined : user?.id,
  );
  const { data: editingPost, isLoading: editingLoading } = useCommunityPost(editPostId ?? undefined);
  const { data: sourceProject, isLoading: projectLoading } = useProject(
    !isEditMode && fromProjectId ? fromProjectId : undefined,
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [mentionedProjects, setMentionedProjects] = useState<MentionedProjectSummary[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUserSummary[]>([]);
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>([]);
  const [mediaAspect, setMediaAspect] = useState<CommunityMediaAspect>(DEFAULT_COMMUNITY_MEDIA_ASPECT);
  const [categoryOverride, setCategoryOverride] = useState<ProjectCategory | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pendingOrderFiles, setPendingOrderFiles] = useState<File[]>([]);

  const { cropFile, enqueueImages, finishCrop, confirmCrop, recropping } =
    useCommunityImageUpload({
      userId: user?.id,
      folder: folderRef.current,
      tier,
      maxImages: limits.images,
      maxTotal: limits.total,
      aspect: mediaAspect,
      setMediaItems,
      mediaItems,
      setUploadingGallery,
    });

  const uploading = uploadingGallery || uploadingVideo;
  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const mediaCount = mediaItems.length;
  const pickDisabled =
    uploading ||
    recropping ||
    cropFile !== null ||
    pendingOrderFiles.length > 0 ||
    mediaCount >= limits.total;
  const aspectLocked = imageCount > 0;

  const mentionedProjectCategories = useMemo(
    () =>
      mentionedProjects
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c?.trim())),
    [mentionedProjects],
  );

  const suggestedCategory = useMemo(
    () =>
      classifyCategory({
        body,
        tags,
        tools,
        hasVideo: videoCount > 0,
        hasImages: imageCount > 0,
        mentionedProjectCategories,
      }),
    [body, tags, tools, videoCount, imageCount, mentionedProjectCategories],
  );

  const postCategory = categoryOverride ?? suggestedCategory;

  const draftScan = detectProfanityInFields({
    title,
    body,
    tags: [...tags, ...tools].join(" "),
  });

  useEffect(() => {
    if (!user || draftLoaded) return;
    if (isEditMode) {
      if (editingLoading) return;
      if (!editingPost) {
        toast.error("ไม่พบโพสต์");
        navigate("/community");
        return;
      }
    } else if (draftLoading || projectLoading) return;

    if (isEditMode && editingPost) {
      if (editingPost.author_id !== user.id || editingPost.status !== "published") {
        toast.error("แก้ไขได้เฉพาะโพสต์ของคุณที่เผยแพร่แล้ว");
        navigate("/community");
        return;
      }
      setTitle(draftDisplayTitle(editingPost.title, editingPost.body ?? ""));
      setBody(editingPost.body ?? "");
      setTags(editingPost.tags ?? []);
      setTools(editingPost.tools ?? []);
      void fetchMentionedProjectSummaries(editingPost.mentioned_project_ids ?? [], user.id).then(setMentionedProjects).catch(() => setMentionedProjects([]));
      void fetchTaggedUserSummaries(editingPost.tagged_user_ids ?? []).then(setTaggedUsers).catch(() => setTaggedUsers([]));
      setMediaAspect(normalizeCommunityMediaAspect(editingPost.media_aspect));
      setCategoryOverride(resolveCommunityCategory(editingPost.category));
      setMediaItems(mediaItemsFromProject(editingPost.gallery_urls ?? [], editingPost.video_urls ?? []));
      setDraftLoaded(true);
      return;
    }

    if (fromProjectId && sourceProject) {
      const desc = sourceProject.description?.trim() || sourceProject.subtitle?.trim() || "";
      setTitle(sourceProject.title ?? "");
      setBody(desc ? `เพิ่งอัปเดตผลงาน "${sourceProject.title}"\n\n${desc}` : `เพิ่งอัปเดตผลงาน "${sourceProject.title}"`);
      setTools(sourceProject.tools ?? []);
      setTags(sourceProject.tags ?? []);
      setMentionedProjects([
        {
          id: sourceProject.id,
          title: sourceProject.title,
          cover_url: sourceProject.cover_url ?? null,
          category: sourceProject.category ?? null,
        },
      ]);
      setMediaAspect(normalizeCommunityMediaAspect("square"));
      const gallery = (sourceProject.gallery_urls ?? []).slice(0, limits.images);
      const videos = (sourceProject.video_urls ?? []).slice(0, limits.videos);
      const combined = [...gallery, ...videos].slice(0, limits.total);
      const g = combined.filter((u) => !videos.includes(u));
      const v = combined.filter((u) => videos.includes(u));
      setMediaItems(mediaItemsFromProject(g, v));
      setDraftLoaded(true);
      toast.message("ดึงข้อมูลจากพอร์ตโฟลิโอแล้ว — แก้แคปชั่นแล้วโพสต์ได้เลย");
      return;
    }

    const loadMentioned = async (ids: string[]) => {
      if (!user || !ids.length) {
        setMentionedProjects([]);
        return;
      }
      try {
        setMentionedProjects(await fetchMentionedProjectSummaries(ids, user.id));
      } catch {
        setMentionedProjects([]);
      }
    };

    const loadTagged = async (ids: string[]) => {
      if (!ids.length) {
        setTaggedUsers([]);
        return;
      }
      try {
        setTaggedUsers(await fetchTaggedUserSummaries(ids));
      } catch {
        setTaggedUsers([]);
      }
    };

    void (async () => {
      const local = loadComposerLocal(user.id);
      const dbTime = existingDraft?.updated_at
        ? new Date(existingDraft.updated_at).getTime()
        : 0;
      let localTime = local?.savedAt ?? 0;
      let activeLocal = local;

      if (activeLocal?.draftId) {
        try {
          const stillOpen = await isCommunityDraftStillOpen(activeLocal.draftId, user.id);
          if (!stillOpen) {
            clearComposerLocal(user.id);
            activeLocal = null;
            localTime = 0;
          }
        } catch {
          /* keep local on transient errors */
        }
      }

      const useLocal =
        activeLocal && localTime > dbTime && composerHasContent(activeLocal);

      if (useLocal && activeLocal) {
        setDraftId(activeLocal.draftId);
        setTitle(activeLocal.title);
        setBody(activeLocal.body);
        setTags(activeLocal.tags);
        setTools(activeLocal.tools);
        void loadMentioned(activeLocal.mentioned_project_ids ?? []);
        void loadTagged(activeLocal.tagged_user_ids ?? []);
        setMediaAspect(normalizeCommunityMediaAspect(activeLocal.media_aspect));
        if (activeLocal.category) {
          setCategoryOverride(resolveCommunityCategory(activeLocal.category));
        }
        setMediaItems(mediaItemsFromProject(activeLocal.gallery_urls, activeLocal.video_urls));
        toast.message("กู้คืนแบบร่างจากเครื่อง");
      } else if (existingDraft) {
        setDraftId(existingDraft.id);
        setTitle(draftDisplayTitle(existingDraft.title, existingDraft.body ?? ""));
        setBody(existingDraft.body ?? "");
        setTags(existingDraft.tags ?? []);
        setTools(existingDraft.tools ?? []);
        void loadMentioned(existingDraft.mentioned_project_ids ?? []);
        void loadTagged(existingDraft.tagged_user_ids ?? []);
        setMediaAspect(normalizeCommunityMediaAspect(existingDraft.media_aspect));
        setCategoryOverride(resolveCommunityCategory(existingDraft.category));
        setMediaItems(
          mediaItemsFromProject(existingDraft.gallery_urls ?? [], existingDraft.video_urls ?? []),
        );
        toast.message("โหลดแบบร่างล่าสุดแล้ว");
      }

      setDraftLoaded(true);
    })();
  }, [user, existingDraft, draftLoaded, draftLoading, isEditMode, editingPost, editingLoading, fromProjectId, sourceProject, projectLoading, limits, navigate]);

  const composerPayload = useCallback(() => {
    const media = splitCommunityMedia(mediaItems);
    return {
      author_id: user!.id,
      title,
      body,
      tags,
      tools,
      mentioned_project_ids: mentionedProjectIds(mentionedProjects),
      tagged_user_ids: taggedUserIds(taggedUsers),
      media_aspect: mediaAspect,
      category: postCategory,
      text_cover_theme: null,
      gallery_urls: media.gallery_urls,
      video_urls: media.video_urls,
      draft_id: draftId,
      edit_post_id: editPostId,
    };
  }, [user, title, body, tags, tools, mentionedProjects, taggedUsers, mediaAspect, postCategory, mediaItems, draftId, editPostId]);

  const handleVideo = async (file: File) => {
    if (!user) return;
    if (!canAddCommunityVideo(imageCount, videoCount)) {
      toast.error(communityMediaLimitMessage("video", imageCount, videoCount));
      return;
    }
    setUploadingVideo(true);
    const toastId = toast.loading("กำลังประมวลผลวิดีโอ...");
    try {
      const url = await uploadProjectVideo(
        file,
        user.id,
        folderRef.current,
        tier,
        (pct) => toast.loading(`กำลังประมวลผลวิดีโอ... ${pct}%`, { id: toastId }),
      );
      setMediaItems((items) => [...items, mediaItemFromUrl(url)]);
      toast.success("อัปโหลดวิดีโอแล้ว", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดวิดีโอไม่สำเร็จ", { id: toastId });
    } finally {
      setUploadingVideo(false);
    }
  };

  const enqueueImageFiles = (images: File[]) => {
    if (!images.length) return;
    const dt = new DataTransfer();
    images.forEach((file) => dt.items.add(file));
    enqueueImages(dt.files);
  };

  const handlePickFiles = (files: File[]) => {
    if (!files.length) return;
    const videos = files.filter((f) => f.type.startsWith("video/"));
    const images = files.filter((f) => f.type.startsWith("image/"));
    const other = files.filter((f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"));

    if (other.length) {
      toast.error("รองรับเฉพาะรูปภาพหรือวิดีโอ");
      return;
    }
    if (videos.length && images.length) {
      toast.message("เลือกรูปหรือวิดีโออย่างใดอย่างหนึ่งต่อครั้ง");
      return;
    }
    if (videos.length) {
      void handleVideo(videos[0]);
      if (videos.length > 1) toast.message("อัปโหลดวิดีโอได้ทีละ 1 ไฟล์");
      return;
    }
    if (!images.length) return;
    if (images.length === 1) {
      enqueueImageFiles(images);
      return;
    }
    setPendingOrderFiles(images);
  };

  const handleSaveDraft = async (silent = false) => {
    if (!user) return false;
    const media = splitCommunityMedia(mediaItems);
    const parsed = communityPostDraftSchema.safeParse({
      title,
      body,
      tags,
      tools,
      mentionedProjectIds: mentionedProjectIds(mentionedProjects),
      taggedUserIds: taggedUserIds(taggedUsers),
      mediaAspect,
      galleryUrls: media.gallery_urls,
      videoUrls: media.video_urls,
    });
    if (!parsed.success) {
      if (!silent) toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return false;
    }
    if (
      !composerHasContent({
        title,
        body,
        tags,
        tools,
        mentioned_project_ids: mentionedProjectIds(mentionedProjects),
        tagged_user_ids: taggedUserIds(taggedUsers),
        gallery_urls: media.gallery_urls,
        video_urls: media.video_urls,
      })
    ) {
      if (!silent) toast.message("ยังไม่มีเนื้อหาให้บันทึก");
      return false;
    }
    try {
      const { id } = await saveDraft.mutateAsync(composerPayload());
      setDraftId(id);
      if (!silent) toast.success("บันทึกแบบร่างแล้ว");
      return true;
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "บันทึกแบบร่างไม่สำเร็จ");
      return false;
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    const media = splitCommunityMedia(mediaItems);
    const parsed = communityPostSchema.safeParse({
      title,
      body,
      tags,
      tools,
      mentionedProjectIds: mentionedProjectIds(mentionedProjects),
      taggedUserIds: taggedUserIds(taggedUsers),
      mediaAspect,
      galleryUrls: media.gallery_urls,
      videoUrls: media.video_urls,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    try {
      if (isEditMode && editPostId) {
        await updatePost.mutateAsync({ ...composerPayload(), edit_post_id: editPostId });
        toast.success("บันทึกการแก้ไขแล้ว");
        navigate(`/community/${editPostId}`);
        return;
      }
      await publish.mutateAsync(composerPayload());
      if (user?.id) clearComposerLocal(user.id);
      setDraftId(null);
      saveCommunityFilter({ ...loadCommunityFilter(), category: "All", feedSource: "all" });
      toast.success("โพสต์สำเร็จ");
      navigate(`/?mode=community`);
    } catch (err) {
      toast.error(formatCommunityActionError(err));
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const isSavingDraft = saveDraft.isPending;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/auth")}>เข้าสู่ระบบเพื่อโพสต์</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <BackButton onClick={handleBack} />
        <div className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="p-2 -mr-2 text-primary hover:text-primary/80 lg:hidden"
            aria-label="ตัวอย่างโพสต์"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-stretch lg:max-w-6xl lg:mx-auto lg:px-6">
        <div className="lg:col-span-2">
          <ModerationBanBanner />
        </div>

        <div className="min-w-0">
          <div className="px-4 pt-1.5">
            <h1 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-foreground">
              <Orbit className="w-4 h-4 text-primary shrink-0" aria-hidden />
              {isEditMode ? "แก้ไข Area Post" : "Area Post"}
            </h1>
          </div>

          {!isEditMode && (
            <CommunityComposerTemplates
              onApply={(patch) => {
                if (patch.title !== undefined) setTitle(patch.title);
                if (patch.body !== undefined) setBody(patch.body);
                if (patch.tags !== undefined) setTags(patch.tags);
              }}
            />
          )}

          <CommunityMediaStrip
            items={mediaItems}
            mediaAspect={mediaAspect}
            uploading={uploading}
            pickDisabled={pickDisabled}
            onPickFiles={handlePickFiles}
            onRemove={(index) => setMediaItems((items) => items.filter((_, i) => i !== index))}
            onReorder={setMediaItems}
          />

          <div className="border-b border-border/60">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Topic Header"
              className="w-full border-0 bg-transparent px-4 py-3 text-base font-medium focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            />
            <div className="mx-4 border-t border-border/50" />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={3000}
              placeholder="เขียนแคปชั่นพร้อมรายละเอียด"
              className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            />
            <CommunityCaptionMetaInline tags={tags} tools={tools} className="px-4 pb-2" />
            <CommunityProfanityHint text={body} className="px-4 pb-2" compact />
            <CommunityLinkPreviewBar urls={extractCommunityLinkUrls(body)} className="px-4 pb-2" />
          </div>

          <CommunityComposerCategoryField
            suggested={suggestedCategory}
            value={categoryOverride}
            onChange={setCategoryOverride}
          />

          <CommunityComposerToolbar
            userId={user.id}
            tags={tags}
            onTagsChange={setTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
            tools={tools}
            onToolsChange={setTools}
            toolInput={toolInput}
            setToolInput={setToolInput}
          />

          <CommunityProjectMentionPicker
            userId={user.id}
            selected={mentionedProjects}
            onChange={setMentionedProjects}
          />

          <CommunityUserTagPicker
            userId={user.id}
            selected={taggedUsers}
            onChange={setTaggedUsers}
          />

          <div className="px-4 pt-4 pb-6">
            <CommunityRulesCard />
            {draftScan.hasProfanity && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                หากยังมีคำละเมิด ระบบจะแทนด้วย *** และอาจนับ strike เมื่อเผยแพร่
              </p>
            )}
          </div>
        </div>

        <CommunityPostPreviewPanel
          title={title}
          body={body}
          tags={tags}
          tools={tools}
          category={postCategory}
          mentionedProjects={mentionedProjects}
          taggedUsers={taggedUsers}
          mediaItems={mediaItems}
          mediaAspect={mediaAspect}
          className="px-4 lg:px-0"
        />
      </div>

      <CommunityComposerFooter
        onSaveDraft={() => void handleSaveDraft()}
        onPublish={() => void handlePublish()}
        savingDraft={isSavingDraft}
        publishing={publish.isPending || updatePost.isPending}
        uploading={uploading}
        publishLabel={isEditMode ? "บันทึกการแก้ไข" : "โพสต์"}
        hideDraft={isEditMode}
      />

      <CommunityPostPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        body={body}
        tags={tags}
        tools={tools}
        category={postCategory}
        mentionedProjects={mentionedProjects}
        taggedUsers={taggedUsers}
        mediaItems={mediaItems}
        mediaAspect={mediaAspect}
      />

      <CommunityImageOrderDialog
        files={pendingOrderFiles}
        open={pendingOrderFiles.length > 0}
        aspectLocked={aspectLocked}
        onOpenChange={(open) => {
          if (!open) setPendingOrderFiles([]);
        }}
        onConfirm={(ordered) => {
          setPendingOrderFiles([]);
          enqueueImageFiles(ordered);
        }}
        onCancel={() => setPendingOrderFiles([])}
      />

      <CommunityImageCropDialog
        file={cropFile}
        aspect={mediaAspect}
        allowAspectChoice={!aspectLocked}
        onAspectChange={setMediaAspect}
        open={cropFile !== null}
        onOpenChange={(open) => {
          if (!open) finishCrop();
        }}
        onConfirm={(file) => void confirmCrop(file)}
        onCancel={finishCrop}
      />
    </main>
  );
};

export default CommunityPostEditorPage;

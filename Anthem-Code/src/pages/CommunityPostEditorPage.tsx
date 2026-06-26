import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useCommunityDraft,
  usePublishCommunityPost,
  useSaveCommunityDraft,
} from "@/hooks/useCommunityPosts";
import { useCommunityAutosave } from "@/hooks/useCommunityAutosave";
import { useCommunityImageUpload } from "@/hooks/useCommunityImageUpload";
import { communityPostDraftSchema, communityPostSchema } from "@/lib/validators";
import { toast } from "sonner";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { getCommunityMediaLimits } from "@/lib/communityLimits";
import {
  countMediaByKind,
  mediaItemFromUrl,
  mediaItemsFromProject,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import { splitCommunityMedia } from "@/lib/communityMedia";
import {
  composerHasContent,
  loadComposerLocal,
} from "@/lib/communityComposerStorage";
import { titlesMatch } from "@/lib/classifyCommunityPost";
import CommunityRulesCard from "@/components/community/CommunityRulesCard";
import CommunityProfanityHint from "@/components/community/CommunityProfanityHint";
import { detectProfanityInFields } from "@/lib/profanity";
import { CommunityMediaStrip } from "@/components/community/CommunityMediaStrip";
import { CommunityComposerToolbar } from "@/components/community/CommunityComposerToolbar";
import { CommunityPostPreviewDialog } from "@/components/community/CommunityPostPreviewDialog";
import { CommunityPostPreviewPanel } from "@/components/community/CommunityPostPreviewPanel";
import { CommunityComposerFooter } from "@/components/community/CommunityComposerFooter";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { cn } from "@/lib/utils";

function draftDisplayTitle(title: string, body: string) {
  return titlesMatch(title, body) ? "" : title;
}

const CommunityPostEditorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const limits = getCommunityMediaLimits(tier);
  const folderRef = useRef(`community-${crypto.randomUUID()}`);
  const publish = usePublishCommunityPost();
  const saveDraft = useSaveCommunityDraft();
  const { data: existingDraft, isLoading: draftLoading } = useCommunityDraft(user?.id);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
  const uploading = uploadingGallery || uploadingVideo;
  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const pickDisabled =
    uploading || (imageCount >= limits.images && videoCount >= limits.videos);

  const { cropFile, enqueueImages, finishCrop, confirmCrop } = useCommunityImageUpload({
    userId: user?.id,
    folder: folderRef.current,
    tier,
    maxImages: limits.images,
    setMediaItems,
    mediaItems,
    setUploadingGallery,
  });

  const autosave = useCommunityAutosave({
    userId: user?.id,
    draftId,
    state: { title, body, tags, tools, gallery_urls, video_urls },
    enabled: draftLoaded && autosaveReady && !publish.isPending,
    saveDraft,
    onDraftId: setDraftId,
  });

  const draftScan = detectProfanityInFields({
    title,
    body,
    tags: [...tags, ...tools].join(" "),
  });

  useEffect(() => {
    if (!user || draftLoaded || draftLoading) return;

    const local = loadComposerLocal(user.id);
    const dbTime = existingDraft?.updated_at
      ? new Date(existingDraft.updated_at).getTime()
      : 0;
    const localTime = local?.savedAt ?? 0;
    const useLocal = local && localTime > dbTime && composerHasContent(local);

    if (useLocal && local) {
      setDraftId(local.draftId);
      setTitle(local.title);
      setBody(local.body);
      setTags(local.tags);
      setTools(local.tools);
      setMediaItems(mediaItemsFromProject(local.gallery_urls, local.video_urls));
      toast.message("กู้คืนแบบร่างจากเครื่อง");
    } else if (existingDraft) {
      setDraftId(existingDraft.id);
      setTitle(draftDisplayTitle(existingDraft.title, existingDraft.body ?? ""));
      setBody(existingDraft.body ?? "");
      setTags(existingDraft.tags ?? []);
      setTools(existingDraft.tools ?? []);
      setMediaItems(
        mediaItemsFromProject(existingDraft.gallery_urls ?? [], existingDraft.video_urls ?? []),
      );
      toast.message("โหลดแบบร่างล่าสุดแล้ว");
    }

    setDraftLoaded(true);
  }, [user, existingDraft, draftLoaded, draftLoading]);

  useEffect(() => {
    if (!draftLoaded) return;
    autosave.markBaseline();
    setAutosaveReady(true);
  }, [draftLoaded]);

  const composerPayload = useCallback(() => {
    const media = splitCommunityMedia(mediaItems);
    return {
      author_id: user!.id,
      title,
      body,
      tags,
      tools,
      gallery_urls: media.gallery_urls,
      video_urls: media.video_urls,
      draft_id: draftId,
    };
  }, [user, title, body, tags, tools, mediaItems, draftId]);

  const handleVideo = async (file: File) => {
    if (!user) return;
    if (videoCount >= limits.videos) {
      toast.error(`อัปโหลดวิดีโอได้สูงสุด ${limits.videos} คลิป/โพสต์`);
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

  const handlePickFile = (file: File) => {
    if (file.type.startsWith("video/")) {
      void handleVideo(file);
      return;
    }
    if (file.type.startsWith("image/")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      enqueueImages(dt.files);
      return;
    }
    toast.error("รองรับเฉพาะรูปภาพหรือวิดีโอ");
  };

  const handleSaveDraft = async (silent = false) => {
    if (!user) return false;
    const media = splitCommunityMedia(mediaItems);
    const parsed = communityPostDraftSchema.safeParse({
      title,
      body,
      tags,
      tools,
      galleryUrls: media.gallery_urls,
      videoUrls: media.video_urls,
    });
    if (!parsed.success) {
      if (!silent) toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return false;
    }
    if (!composerHasContent({ title, body, tags, tools, gallery_urls: media.gallery_urls, video_urls: media.video_urls })) {
      if (!silent) toast.message("ยังไม่มีเนื้อหาให้บันทึก");
      return false;
    }
    try {
      const { id } = await saveDraft.mutateAsync(composerPayload());
      setDraftId(id);
      autosave.markBaseline();
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
      galleryUrls: media.gallery_urls,
      videoUrls: media.video_urls,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    try {
      const { id } = await publish.mutateAsync(composerPayload());
      autosave.clearLocal();
      toast.success("โพสต์สำเร็จ");
      navigate(`/community/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "โพสต์ไม่สำเร็จ");
    }
  };

  const handleBack = async () => {
    if (autosave.isDirty) await autosave.flushSave();
    navigate(-1);
  };

  const autosaveHint =
    autosave.status === "saving"
      ? "กำลังบันทึก..."
      : autosave.status === "saved"
        ? "บันทึกอัตโนมัติแล้ว"
        : autosave.status === "error"
          ? "บันทึกอัตโนมัติไม่สำเร็จ"
          : autosave.status === "pending"
            ? "รอบันทึก..."
            : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/auth")}>เข้าสู่ระบบเพื่อโพสต์</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <button
          type="button"
          onClick={() => void handleBack()}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          aria-label="กลับ"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {autosaveHint && (
          <span
            className={cn(
              "text-[11px] text-muted-foreground",
              autosave.status === "error" && "text-destructive",
            )}
          >
            {autosaveHint}
          </span>
        )}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="p-2 -mr-2 text-primary hover:text-primary/80 lg:hidden"
          aria-label="ตัวอย่างโพสต์"
        >
          <Eye className="w-5 h-5" />
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:max-w-6xl lg:mx-auto lg:px-6">
        <div className="min-w-0">
          <ModerationBanBanner />

          <CommunityMediaStrip
            items={mediaItems}
            uploading={uploading}
            pickDisabled={pickDisabled}
            onPickFile={handlePickFile}
            onRemove={(index) => setMediaItems((items) => items.filter((_, i) => i !== index))}
          />

          <div className="border-b border-border/60">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Caption Header"
              className="w-full border-0 bg-transparent px-4 py-3 text-base font-medium focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            />
            <div className="mx-4 border-t border-border/50" />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={3000}
              placeholder="เขียนแคปชั่นพร้อมรายละเอียดเพื่อเพิ่มยอดเข้าชม"
              className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            />
            <CommunityProfanityHint text={body} className="px-4 pb-2" compact />
          </div>

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
          mediaItems={mediaItems}
          className="px-4 lg:px-0"
        />
      </div>

      <CommunityComposerFooter
        onSaveDraft={() => void handleSaveDraft()}
        onPublish={() => void handlePublish()}
        savingDraft={saveDraft.isPending || autosave.status === "saving"}
        publishing={publish.isPending}
      />

      <CommunityPostPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        body={body}
        tags={tags}
        tools={tools}
        mediaItems={mediaItems}
      />

      <CommunityImageCropDialog
        file={cropFile}
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

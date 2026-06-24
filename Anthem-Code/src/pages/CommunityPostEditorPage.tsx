import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateCommunityPost,
  type CommunityQuestionTopic,
} from "@/hooks/useCommunityPosts";
import { communityPostSchema } from "@/lib/validators";
import { categories } from "@/data/projectTypes";
import { COMMUNITY_KIND_INFO, parseCommunityKind } from "@/data/createActions";
import { QUESTION_TOPICS } from "@/data/communityTopics";
import { toast } from "sonner";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/UserAvatar";
import TagPicker from "@/components/tags/TagPicker";
import { GalleryMediaButtons } from "@/components/project/GalleryMediaButtons";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { getCommunityMediaLimits } from "@/lib/communityLimits";
import {
  countMediaByKind,
  mediaItemFromUrl,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import { splitCommunityMedia } from "@/lib/communityMedia";
import CommunityRulesCard from "@/components/community/CommunityRulesCard";
import CommunityProfanityHint from "@/components/community/CommunityProfanityHint";
import { detectProfanityInFields } from "@/lib/profanity";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TOPIC_CATEGORIES = categories.filter((c) => c !== "Explore");

const CommunityPostEditorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const limits = getCommunityMediaLimits(tier);
  const folderRef = useRef(`community-${crypto.randomUUID()}`);
  const create = useCreateCommunityPost();
  const urlKind = parseCommunityKind(searchParams.get("kind"));
  const [isQuestion, setIsQuestion] = useState(urlKind === "question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(TOPIC_CATEGORIES[0] ?? "Graphic");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [questionTopic, setQuestionTopic] = useState<CommunityQuestionTopic | null>(null);
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (urlKind === "question") setIsQuestion(true);
  }, [urlKind]);

  const postKind = isQuestion ? "question" : "tip";
  const kindInfo = COMMUNITY_KIND_INFO[postKind];
  const draftScan = detectProfanityInFields({
    title,
    body,
    tags: tags.join(" "),
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? null);
        setDisplayName(data?.display_name ?? null);
      });
  }, [user]);

  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");

  const handleImages = async (files: FileList) => {
    if (!user) return;
    const max = limits.images;
    if (imageCount >= max) {
      toast.error(`อัปโหลดรูปได้สูงสุด ${max} รูป/โพสต์`);
      return;
    }
    setUploadingGallery(true);
    try {
      const next = [...mediaItems];
      for (const file of Array.from(files)) {
        if (countMediaByKind(next, "image") >= max) break;
        const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
        next.push(mediaItemFromUrl(url));
      }
      setMediaItems(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleVideo = async (file: File) => {
    if (!user) return;
    if (videoCount >= limits.videos) {
      toast.error(`อัปโหลดวิดีโอได้สูงสุด ${limits.videos} คลิป/โพสต์`);
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await uploadProjectVideo(file, user.id, folderRef.current, tier);
      setMediaItems((items) => [...items, mediaItemFromUrl(url)]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดวิดีโอไม่สำเร็จ");
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((items) => items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
    const parsed = communityPostSchema.safeParse({
      postKind,
      title,
      body,
      category,
      tags,
      galleryUrls: gallery_urls,
      videoUrls: video_urls,
      questionTopic: postKind === "question" ? questionTopic : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    try {
      const { id } = await create.mutateAsync({
        author_id: user.id,
        post_kind: parsed.data.postKind,
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category,
        tags: parsed.data.tags,
        gallery_urls: parsed.data.galleryUrls,
        video_urls: parsed.data.videoUrls,
        question_topic: parsed.data.questionTopic ?? null,
      });
      toast.success("โพสต์สำเร็จ");
      navigate(`/community/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "โพสต์ไม่สำเร็จ");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/auth")}>เข้าสู่ระบบเพื่อโพสต์</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-app-ambient pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <h1 className="text-2xl font-semibold">สร้างโพสต์</h1>
        <CommunityRulesCard />
        <ModerationBanBanner />
        <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-border/60">
            <UserAvatar
              src={avatarUrl}
              name={displayName ?? user.email ?? "U"}
              className="w-10 h-10"
              fallbackClassName="text-sm"
            />
            <div>
              <p className="text-sm font-medium">{displayName ?? "คุณ"}</p>
              <p className="text-xs text-muted-foreground">โพสต์แบบสาธารณะใน Designer Area</p>
            </div>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
              isQuestion ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 hover:bg-muted/40",
            )}
          >
            <input
              type="checkbox"
              checked={isQuestion}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsQuestion(checked);
                if (!checked) setQuestionTopic(null);
              }}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                โพสต์เป็นคำถาม Q&A
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                ติ๊กถ้าต้องการถามชุมชน — ไม่ติ๊กจะโพสต์เป็น Tips
              </span>
            </span>
          </label>

          {isQuestion && (
            <div className="space-y-2">
              <label className="text-sm font-medium">ประเภทคำถาม *</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUESTION_TOPICS.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setQuestionTopic(id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                      questionTopic === id
                        ? "border-primary bg-primary/10"
                        : "border-border/60 hover:bg-muted/30",
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="block text-muted-foreground mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">หมวดงาน</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2 text-sm"
            >
              {TOPIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <TagPicker
            userId={user.id}
            tags={tags}
            onChange={setTags}
            input={tagInput}
            setInput={setTagInput}
            max={8}
          />

          <div>
            <label className="text-sm font-medium">หัวข้อ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-xl bg-secondary border border-border px-3 py-2 text-sm"
              placeholder={kindInfo.titlePlaceholder}
            />
            <CommunityProfanityHint text={title} className="mt-2" compact />
          </div>
          <div>
            <label className="text-sm font-medium">เนื้อหา</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={3000}
              placeholder={kindInfo.bodyPlaceholder}
              className="mt-1 resize-none"
            />
            <CommunityProfanityHint text={body} className="mt-2" compact />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">รูป / วิดีโอ</label>
              <GalleryMediaButtons
                imageDisabled={uploadingGallery || imageCount >= limits.images}
                videoDisabled={uploadingVideo || videoCount >= limits.videos}
                uploadingImage={uploadingGallery}
                uploadingVideo={uploadingVideo}
                onPickImages={handleImages}
                onPickVideo={(f) => void handleVideo(f)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              สูงสุด {limits.images} รูป{limits.videos > 0 ? `, ${limits.videos} วิดีโอ` : ""} — สไตล์ Lemon8
            </p>
            {mediaItems.length > 0 && (
              <SortableGalleryGrid
                items={mediaItems}
                coverUrl={mediaItems[0]?.url ?? ""}
                onReorder={setMediaItems}
                onSetCover={(url) => {
                  const idx = mediaItems.findIndex((m) => m.url === url);
                  if (idx <= 0) return;
                  setMediaItems((items) => {
                    const copy = [...items];
                    const [picked] = copy.splice(idx, 1);
                    copy.unshift(picked);
                    return copy;
                  });
                }}
                onRemove={removeMedia}
                layout="list"
              />
            )}
            {(uploadingGallery || uploadingVideo) && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังอัปโหลด...
              </p>
            )}
          </div>

          <Button type="submit" disabled={create.isPending} className="rounded-full w-full">
            {create.isPending ? "กำลังโพสต์..." : "เผยแพร่"}
          </Button>
          {draftScan.hasProfanity && (
            <p className="text-center text-xs text-muted-foreground">
              หากยังมีคำละเมิด ระบบจะแทนด้วย *** และอาจนับ strike เมื่อเผยแพร่
            </p>
          )}
        </form>
      </div>
      <Footer />
    </main>
  );
};

export default CommunityPostEditorPage;

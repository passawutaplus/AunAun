import { useRef, useState } from "react";
import { Camera, Crop, Eye, Loader2, Pencil, Plus, Settings, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProfileSharePopover from "@/components/profile/ProfileSharePopover";
import DisciplineChips from "@/components/profile/DisciplineChips";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { useUpdateProfileMedia } from "@/hooks/useProfile";
import { uploadProjectImage, assertImageWithinUploadLimit, IMAGE_UPLOAD_MAX_INPUT_MB } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import OpportunityTypeChips from "@/components/opportunity/OpportunityTypeChips";
import UserAvatar from "@/components/UserAvatar";

type ProfileLike = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  /** Uncropped source — re-crop always uses this, not cover_url. */
  cover_original_url?: string | null;
};

type Props = {
  userId: string;
  profile: ProfileLike;
  stats: { works: number; followers: number; following: number };
  shareUrl: string;
  shareTitle: string;
  shareMessage: string;
  sharePathLabel: string;
  onShareInteract?: () => void;
  onPreview?: () => void;
  onPost?: () => void;
  onSettings?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  opportunityStatus?: string | null;
  opportunityTypes?: string[] | null;
  disciplines?: string[] | null;
  onOpportunityEdit?: () => void;
};

async function urlToImageFile(url: string, name = "cover.jpg"): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("โหลดภาพปกไม่สำเร็จ");
  const blob = await res.blob();
  const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  return new File([blob], name, { type });
}

type CoverCropSession = {
  /** File shown in the crop dialog (original source). */
  cropFile: File;
  /** Raw upload to persist as cover_original_url (new uploads only). */
  originalFile: File | null;
  mode: "upload" | "adjust";
};

export default function ProfileCoverHeader({
  userId,
  profile,
  stats,
  shareUrl,
  shareTitle,
  shareMessage,
  sharePathLabel,
  onShareInteract,
  onPreview,
  onPost,
  onSettings,
  onFollowersClick,
  onFollowingClick,
  opportunityStatus,
  opportunityTypes,
  disciplines,
  onOpportunityEdit,
}: Props) {
  const { tier } = useSubscription();
  const updateMedia = useUpdateProfileMedia(userId);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverSession, setCoverSession] = useState<CoverCropSession | null>(null);

  const coverUrl = profile.cover_url?.trim();
  const coverOriginalUrl = profile.cover_original_url?.trim();
  const hasCover = !!coverUrl && coverUrl.startsWith("http");
  const hasOriginal =
    !!coverOriginalUrl && coverOriginalUrl.startsWith("http");

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      assertImageWithinUploadLimit(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `ไฟล์ใหญ่เกิน ${IMAGE_UPLOAD_MAX_INPUT_MB}MB`);
      return;
    }
    setAvatarBusy(true);
    try {
      const url = await uploadProjectImage(file, userId, "avatar", tier);
      await updateMedia.mutateAsync({ avatar_url: url });
      toast.success("อัปเดตรูปโปรไฟล์แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setAvatarBusy(false);
    }
  };

  const closeCoverCrop = () => {
    setCoverSession(null);
  };

  const openCoverCrop = (session: CoverCropSession) => {
    setCoverMenuOpen(false);
    setCoverSession(session);
  };

  const adjustExistingCover = async () => {
    if (!hasCover) {
      toast.message("ยังไม่มีภาพปก — อัปโหลดภาพก่อน");
      return;
    }
    if (!hasOriginal || !coverOriginalUrl) {
      toast.message("ยังไม่มีภาพต้นฉบับ — อัปโหลดภาพปกใหม่ แล้วค่อยปรับครอปได้จากต้นฉบับ");
      setCoverMenuOpen(false);
      coverInput.current?.click();
      return;
    }
    setCoverMenuOpen(false);
    setCoverBusy(true);
    try {
      const file = await urlToImageFile(coverOriginalUrl, "cover-original.jpg");
      openCoverCrop({ cropFile: file, originalFile: null, mode: "adjust" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปิดปรับภาพปกไม่สำเร็จ");
    } finally {
      setCoverBusy(false);
    }
  };

  const confirmCoverCrop = async (cropped: File) => {
    const session = coverSession;
    closeCoverCrop();
    if (!session) return;
    setCoverBusy(true);
    try {
      if (session.mode === "upload" && session.originalFile) {
        const [originalUrl, displayUrl] = await Promise.all([
          uploadProjectImage(session.originalFile, userId, "cover-original", tier),
          uploadProjectImage(cropped, userId, "cover", tier, {
            skipCompression: true,
          }),
        ]);
        await updateMedia.mutateAsync({
          cover_url: displayUrl,
          cover_original_url: originalUrl,
        });
      } else {
        const displayUrl = await uploadProjectImage(cropped, userId, "cover", tier, {
          skipCompression: true,
        });
        await updateMedia.mutateAsync({ cover_url: displayUrl });
      }
      toast.success("อัปเดตภาพปกแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <section className="mb-4 md:mb-6">
      <div className="relative aspect-[32/9] w-full bg-muted overflow-hidden rounded-b-2xl md:rounded-b-3xl group/cover">
        {hasCover ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-brand opacity-75" />
        )}

        <Popover open={coverMenuOpen} onOpenChange={setCoverMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={coverBusy}
              className={cn(
                "absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10",
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                "bg-background/90 text-foreground shadow-md border border-border/60",
                "hover:bg-background/95",
                "hover:bg-background disabled:opacity-60",
              )}
            >
              {coverBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              แก้ไขภาพปก
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-48 p-1.5 rounded-xl">
            <button
              type="button"
              disabled={!hasCover || coverBusy}
              onClick={() => void adjustExistingCover()}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                hasCover
                  ? "hover:bg-accent text-foreground"
                  : "text-muted-foreground cursor-not-allowed opacity-60",
              )}
            >
              <Crop className="w-4 h-4 text-primary shrink-0" />
              ปรับภาพปก
            </button>
            <button
              type="button"
              disabled={coverBusy}
              onClick={() => {
                setCoverMenuOpen(false);
                coverInput.current?.click();
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-accent text-foreground transition-colors"
            >
              <Upload className="w-4 h-4 text-primary shrink-0" />
              อัปโหลดภาพปก
            </button>
          </PopoverContent>
        </Popover>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              assertImageWithinUploadLimit(file);
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : `ไฟล์ใหญ่เกิน ${IMAGE_UPLOAD_MAX_INPUT_MB}MB`,
              );
              return;
            }
            openCoverCrop({
              cropFile: file,
              originalFile: file,
              mode: "upload",
            });
          }}
        />
      </div>

      <div className="relative -mt-12 sm:-mt-14 md:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="relative shrink-0 group/avatar self-start">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.display_name}
              username={profile.username}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 ring-4 ring-background shadow-lg"
              fallbackClassName="text-3xl md:text-4xl"
            />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => avatarInput.current?.click()}
              title="เปลี่ยนรูปโปรไฟล์"
              className={cn(
                "absolute bottom-1 right-1 w-9 h-9 rounded-full",
                "bg-background border border-border shadow-md flex items-center justify-center",
                "hover:bg-secondary transition-colors disabled:opacity-60",
              )}
            >
              {avatarBusy ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="w-4 h-4 text-foreground" />
              )}
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void uploadAvatar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1 sm:pb-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-medium text-foreground leading-tight truncate">
                {profile.display_name || "ยังไม่ได้ตั้งชื่อ"}
              </h1>
              {profile.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}

              <div className="mt-2.5 space-y-2">
                <DisciplineChips disciplines={disciplines} size="md" />
                <div className="flex flex-wrap items-start gap-2">
                  <OpportunityTypeChips
                    className="min-w-0 flex-1"
                    status={opportunityStatus}
                    types={opportunityTypes}
                    size="md"
                  />
                  {onOpportunityEdit ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={onOpportunityEdit}
                      className="h-8 w-8 shrink-0 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                      title="แก้ไขกำลังมองหาและสายงาน"
                      aria-label="แก้ไขกำลังมองหาและสายงาน"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm">
                <span>
                  <strong className="text-foreground">{stats.works}</strong>{" "}
                  <span className="text-muted-foreground">ผลงาน</span>
                </span>
                <button
                  type="button"
                  onClick={onFollowersClick}
                  className={cn(onFollowersClick && "hover:text-primary transition-colors")}
                  disabled={!onFollowersClick}
                >
                  <strong className="text-foreground">{stats.followers}</strong>{" "}
                  <span className="text-muted-foreground">ผู้ติดตาม</span>
                </button>
                <button
                  type="button"
                  onClick={onFollowingClick}
                  className={cn(onFollowingClick && "hover:text-primary transition-colors")}
                  disabled={!onFollowingClick}
                >
                  <strong className="text-foreground">{stats.following}</strong>{" "}
                  <span className="text-muted-foreground">ติดตาม</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {onPost && (
                <Button
                  onClick={onPost}
                  size="icon"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                  title="โพสต์ชุมชน"
                  aria-label="โพสต์ชุมชน"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              {onPreview && (
                <Button
                  onClick={onPreview}
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="ดูตัวอย่างก่อนแชร์ — ยังไม่ใช่ลิงก์ที่ส่งให้ลูกค้า"
                  aria-label="พรีวิว"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <ProfileSharePopover
                url={shareUrl}
                title={shareTitle}
                message={shareMessage}
                pathLabel={sharePathLabel}
                align="end"
                onShared={onShareInteract}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="แชร์ลิงก์พอร์ตโฟล์สาธารณะให้ลูกค้า"
                  aria-label="แชร์พอร์ตโฟล์"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </ProfileSharePopover>
              {onSettings && (
                <Button
                  type="button"
                  onClick={onSettings}
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="ตั้งค่าโปรไฟล์"
                  aria-label="ตั้งค่าโปรไฟล์"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CommunityImageCropDialog
        file={coverSession?.cropFile ?? null}
        aspect="coverBanner"
        open={!!coverSession}
        onOpenChange={(next) => {
          if (!next) closeCoverCrop();
        }}
        onCancel={closeCoverCrop}
        onConfirm={(file) => {
          void confirmCoverCrop(file);
        }}
        title="ปรับภาพปก"
        description="ลากและซูมจากภาพต้นฉบับให้พอดีกรอบภาพปก แล้วกดยืนยัน"
      />
    </section>
  );
}

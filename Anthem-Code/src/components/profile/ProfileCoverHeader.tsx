import { useRef, useState } from "react";
import { Camera, Eye, LayoutGrid, Loader2, MapPin, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileSharePopover from "@/components/profile/ProfileSharePopover";
import { useUpdateProfileMedia } from "@/hooks/useProfile";
import { uploadProjectImage } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import OpportunityTypeChips from "@/components/opportunity/OpportunityTypeChips";

type ProfileLike = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: string | null;
  location: string | null;
};

type Props = {
  userId: string;
  profile: ProfileLike;
  stats: { works: number; followers: number; following: number };
  onManage: () => void;
  shareUrl: string;
  shareTitle: string;
  shareMessage: string;
  sharePathLabel: string;
  onShareInteract?: () => void;
  onPreview?: () => void;
  onPost?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  opportunityStatus?: string | null;
  opportunityTypes?: string[] | null;
  onOpportunityEdit?: () => void;
};

export default function ProfileCoverHeader({
  userId,
  profile,
  stats,
  onManage,
  shareUrl,
  shareTitle,
  shareMessage,
  sharePathLabel,
  onShareInteract,
  onPreview,
  onPost,
  onFollowersClick,
  onFollowingClick,
  opportunityStatus,
  opportunityTypes,
  onOpportunityEdit,
}: Props) {
  const { tier } = useSubscription();
  const updateMedia = useUpdateProfileMedia(userId);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const coverUrl = profile.cover_url?.trim();
  const hasCover = !!coverUrl && coverUrl.startsWith("http");

  const upload = async (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file) return;
    const setBusy = kind === "cover" ? setCoverBusy : setAvatarBusy;
    setBusy(true);
    try {
      const url = await uploadProjectImage(file, userId, kind, tier);
      await updateMedia.mutateAsync(
        kind === "avatar" ? { avatar_url: url } : { cover_url: url },
      );
      toast.success(kind === "avatar" ? "อัปเดตรูปโปรไฟล์แล้ว" : "อัปเดตภาพปกแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 md:mb-6">
      {/* Cover banner */}
      <div className="relative h-40 sm:h-48 md:h-56 bg-muted overflow-hidden md:mx-4 md:rounded-b-3xl group/cover">
        {hasCover ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-brand opacity-75" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent pointer-events-none" />

        <button
          type="button"
          disabled={coverBusy}
          onClick={() => coverInput.current?.click()}
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
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0], "cover");
            e.target.value = "";
          }}
        />
      </div>

      {/* Avatar + identity — sits below cover, no overlap with main content */}
      <div className="relative px-4 md:px-8 -mt-12 sm:-mt-14 md:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="relative shrink-0 group/avatar self-start">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-background shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl md:text-4xl font-medium ring-4 ring-background shadow-lg">
                {(profile.display_name || "?")[0]}
              </div>
            )}
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
                upload(e.target.files?.[0], "avatar");
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
              {profile.role && (
                <p className="mt-1 text-sm text-primary font-medium">{profile.role}</p>
              )}
              {profile.location && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </p>
              )}
              {onOpportunityEdit ? (
                <button
                  type="button"
                  onClick={onOpportunityEdit}
                  className="mt-2.5 text-left rounded-xl -mx-1 px-1 py-1 hover:bg-accent/60 transition-colors"
                  title="แตะเพื่อปรับว่าตอนนี้เปิดรับอะไรอยู่"
                >
                  <OpportunityTypeChips
                    status={opportunityStatus}
                    types={opportunityTypes}
                    size="md"
                  />
                </button>
              ) : (
                <OpportunityTypeChips
                  className="mt-2.5"
                  status={opportunityStatus}
                  types={opportunityTypes}
                  size="md"
                />
              )}
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
              <Button
                onClick={onManage}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" /> แดชบอร์ด
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

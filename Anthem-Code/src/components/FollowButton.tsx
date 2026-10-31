import { UserPlus, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFollowState, useFollowsYou } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { FOLLOWED_DESIGNERS_PATH } from "@/hooks/useFollowedDesigners";
import { toast } from "sonner";
import { useAuthDialog } from "@/stores/authDialogStore";
import { cn } from "@/lib/utils";

interface Props {
  freelancerId?: string;
  size?: "sm" | "default";
  variant?: "full" | "compact";
  iconOnly?: boolean;
  tone?: "primary" | "muted";
  showFollowerCount?: boolean;
  className?: string;
  visitorPreview?: boolean;
  followLabel?: string;
  followingLabel?: string;
  unfollowLabel?: string;
  /** Keep the text once following ("กำลังติดตาม" / "ติดตามกันแล้ว") instead of shrinking to an icon. */
  showFollowingLabel?: boolean;
  /** Name for the confirmation toast (with a link to Portfolio → Designers). No toast when left out. */
  announceName?: string;
}

const FollowButton = ({
  freelancerId,
  size = "default",
  variant = "full",
  iconOnly = false,
  tone = "primary",
  showFollowerCount = true,
  className,
  visitorPreview = false,
  followLabel = "ติดตาม",
  followingLabel = "กำลังติดตาม",
  unfollowLabel = "เลิกติดตาม",
  showFollowingLabel = false,
  announceName,
}: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { isFollowing, isSelf, toggle, isPending, followers } = useFollowState(freelancerId);
  const followsYou = useFollowsYou(isSelf ? undefined : freelancerId);

  if (!freelancerId || (isSelf && !visitorPreview)) return null;

  const mutual = isFollowing && followsYou;
  const label = isFollowing
    ? mutual
      ? "ติดตามกันแล้ว"
      : followingLabel
    : followsYou
      ? "ติดตามกลับ"
      : followLabel;
  const hint = isFollowing
    ? mutual
      ? "ติดตามกันทั้งคู่ — แท็กเป็นผู้ร่วมงานในผลงานได้ · กดเพื่อเลิกติดตาม"
      : unfollowLabel
    : followsYou
      ? "คนนี้ติดตามคุณอยู่ — ติดตามกลับเพื่อแท็กกันในผลงานได้"
      : followLabel;

  const announce = (followed: boolean) => {
    if (!announceName) return;
    if (!followed) {
      toast.success(`เลิกติดตาม ${announceName} แล้ว`);
      return;
    }
    toast.success(followsYou ? `ติดตามกันแล้วกับ ${announceName}` : `ติดตาม ${announceName} แล้ว`, {
      description: followsYou
        ? "แท็กเป็นผู้ร่วมงานในผลงานได้แล้ว · ดูรวมได้ที่ Portfolio → Designers"
        : `${announceName} จะได้รับแจ้งเตือน · ถ้าติดตามกลับ จะแท็กกันในผลงานได้`,
      action: { label: "ดูทั้งหมด", onClick: () => navigate(FOLLOWED_DESIGNERS_PATH) },
    });
  };

  const handle = () => {
    if (visitorPreview) {
      toast.message("นี่คือมุมมองผู้เยี่ยมชม — ปุ่มนี้ใช้งานได้จริงเมื่อคนอื่นเปิดโปรไฟล์ของคุณ");
      return;
    }
    if (!user) {
      toast.info("กรุณาเข้าสู่ระบบก่อนติดตาม");
      openAuth();
      return;
    }
    toggle(undefined, {
      onSuccess: (result) => announce(result.followed),
      onError: () => toast.error("ทำรายการไม่สำเร็จ", { description: "ลองใหม่อีกครั้ง" }),
    });
  };

  // By default the button shrinks to an icon once following; showFollowingLabel keeps the text.
  const hideLabel = iconOnly || (isFollowing && !showFollowingLabel);
  const Icon = mutual ? Users : isFollowing ? UserCheck : UserPlus;

  return (
    <Button
      onClick={handle}
      disabled={isPending}
      size={hideLabel ? "icon" : size}
      variant={tone === "muted" ? "ghost" : isFollowing ? "outline" : "default"}
      aria-label={isFollowing ? `${label} — ${unfollowLabel}` : label}
      aria-pressed={isFollowing}
      title={hint}
      className={cn(
        "rounded-full shrink-0",
        tone === "muted" &&
          "glass-panel hover:bg-accent/40 bg-transparent shadow-none text-muted-foreground border-0",
        tone === "muted" && isFollowing && "text-primary",
        tone === "muted" && hideLabel && "w-9 h-9",
        tone === "muted" && !hideLabel && "h-8 px-3 text-xs font-medium",
        tone === "primary" && !hideLabel && (isFollowing ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"),
        tone === "primary" && hideLabel && "h-9 w-9",
        className,
      )}
    >
      <Icon className={cn("w-4 h-4", !hideLabel && "mr-1")} />
      {!hideLabel && label}
      {!hideLabel && !isFollowing && showFollowerCount && variant === "full" && (
        <span className="ml-1 opacity-70">· {followers}</span>
      )}
    </Button>
  );
};

export default FollowButton;

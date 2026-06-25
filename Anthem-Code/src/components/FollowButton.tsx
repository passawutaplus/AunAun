import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollowState } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
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
}

const FollowButton = ({
  freelancerId,
  size = "default",
  variant = "full",
  iconOnly = false,
  tone = "primary",
  showFollowerCount = true,
  className,
}: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { isFollowing, isSelf, toggle, isPending, followers } = useFollowState(freelancerId);

  if (!freelancerId || isSelf) return null;

  const handle = () => {
    if (!user) {
      toast.info("กรุณาเข้าสู่ระบบก่อนติดตาม");
      openAuth();
      return;
    }
    toggle();
  };

  return (
    <Button
      onClick={handle}
      disabled={isPending}
      size={iconOnly ? "icon" : size}
      variant={tone === "muted" ? "ghost" : isFollowing ? "outline" : "default"}
      aria-label={isFollowing ? "เลิกติดตาม" : "ติดตาม"}
      className={cn(
        "rounded-full shrink-0",
        tone === "muted" &&
          "glass-panel hover:bg-accent/40 bg-transparent shadow-none text-muted-foreground border-0",
        tone === "muted" && isFollowing && "text-primary",
        tone === "muted" && iconOnly && "w-9 h-9",
        tone === "muted" && !iconOnly && "h-8 px-3 text-xs font-medium",
        tone === "primary" && !iconOnly && (isFollowing ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"),
        tone === "primary" && iconOnly && "h-7 w-7",
        className,
      )}
    >
      {isFollowing ? <UserCheck className={cn("w-4 h-4", !iconOnly && "mr-1")} /> : <UserPlus className={cn("w-4 h-4", !iconOnly && "mr-1")} />}
      {!iconOnly && (isFollowing ? "กำลังติดตาม" : "ติดตาม")}
      {!iconOnly && showFollowerCount && variant === "full" && (
        <span className="ml-1 opacity-70">· {followers}</span>
      )}
    </Button>
  );
};

export default FollowButton;

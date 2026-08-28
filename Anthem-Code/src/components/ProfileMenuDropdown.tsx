import type { PointerEvent, ReactNode } from "react";
import {
  User,
  LogOut,
  Settings,
  Wallet,
  MessageSquarePlus,
  MessagesSquare,
  Shield,
  BookOpen,
  ArrowLeft,
  Rocket,
} from "lucide-react";
import ManageWorkIcon from "@/components/icons/ManageWorkIcon";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { signOutApp } from "@/lib/signOutApp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeModePicker } from "@/components/settings/ThemeModePicker";
import { FeedGridDensityPicker } from "@/components/feed/FeedGridDensityPicker";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { openBrandLineContact } from "@/lib/brandConfig";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { toast } from "sonner";

function preventClose(e: PointerEvent) {
  e.preventDefault();
}

type ProfileMenuVariant = "default" | "forum";

type ProfileMenuContentProps = {
  onNavigate?: () => void;
  variant?: ProfileMenuVariant;
};

export function ProfileMenuContent({ onNavigate, variant = "default" }: ProfileMenuContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();
  const openFeedback = useOpenFeedbackTicket();
  const isVerified = !!(profile as { is_verified?: boolean } | null)?.is_verified;

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const signOut = async () => {
    await signOutApp(queryClient);
    navigate(variant === "forum" ? "/forum" : "/");
    onNavigate?.();
  };

  return (
    <>
      <DropdownMenuItem
        onClick={() => go(variant === "forum" ? "/forum/me" : "/portfolio")}
        className="rounded-lg"
      >
        <User className="w-4 h-4 mr-2" />{" "}
        {variant === "forum" ? "โปรไฟล์ชุมชนของฉัน" : "My Profile"}
      </DropdownMenuItem>
      {variant !== "forum" ? (
        <>
          <DropdownMenuItem onClick={() => go("/dashboard")} className="rounded-lg">
            <ManageWorkIcon className="w-4 h-4 mr-2" /> My Studio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/earnings")} className="rounded-lg">
            <Wallet className="w-4 h-4 mr-2" /> My Wallet
          </DropdownMenuItem>
        </>
      ) : (
        <>
          <DropdownMenuItem onClick={() => go("/")} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" /> กลับฟีดหลัก
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/forum")} className="rounded-lg">
            <MessagesSquare className="w-4 h-4 mr-2" /> หน้าแรกชุมชน
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/legal/community")} className="rounded-lg">
            <BookOpen className="w-4 h-4 mr-2" /> แนวทางชุมชน
          </DropdownMenuItem>
        </>
      )}
      {variant !== "forum" && !isVerified ? (
        <DropdownMenuItem onClick={() => go("/verify")} className="rounded-lg">
          <Rocket className="w-4 h-4 mr-2" /> Become a Creator
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          onNavigate?.();
          openFeedback();
        }}
        className="rounded-lg"
      >
        <MessageSquarePlus className="w-4 h-4 mr-2" /> ส่งฟีดแบ็ก
      </DropdownMenuItem>
      {variant !== "forum" ? (
        <DropdownMenuItem
          onClick={() => {
            window.open("/forum", "_blank", "noopener,noreferrer");
            onNavigate?.();
          }}
          className="rounded-lg"
        >
          <MessagesSquare className="w-4 h-4 mr-2" /> Community
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onClick={() => {
          onNavigate?.();
          if (!openBrandLineContact()) {
            toast.message("กำลังเปิดช่องทางไลน์เร็วๆ นี้");
          }
        }}
        className="rounded-lg"
      >
        <LineMarkIcon className="w-4 h-4 mr-2" /> ติดต่อเรา Line
      </DropdownMenuItem>
      {variant === "forum" && isAdmin ? (
        <DropdownMenuItem onClick={() => go("/forum/admin")} className="rounded-lg">
          <Shield className="w-4 h-4 mr-2" /> แอดมินฟอรัม
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5 space-y-1" onPointerDown={preventClose}>
        <ThemeModePicker label="Theme" />
        {variant !== "forum" ? <FeedGridDensityPicker label="Grid Feed" /> : null}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => go("/settings")} className="rounded-lg">
        <Settings className="w-4 h-4 mr-2" /> Setting
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => void signOut()} className="rounded-lg text-destructive focus:text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> Log Out
      </DropdownMenuItem>
    </>
  );
}

type ProfileMenuDropdownProps = {
  trigger: ReactNode;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  onOpenChange?: (open: boolean) => void;
  variant?: ProfileMenuVariant;
};

export function ProfileMenuDropdown({
  trigger,
  contentClassName,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  onOpenChange,
  variant = "default",
}: ProfileMenuDropdownProps) {
  return (
    // modal=false: avoid body scroll-lock layout jump that makes the top nav kick upward
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("w-60 rounded-xl glass-panel-strong", contentClassName)}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ProfileMenuContent variant={variant} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import type { PointerEvent, ReactNode } from "react";
import {
  User,
  LogOut,
  Settings,
  Layers3,
  Coins,
  FolderKanban,
  Sparkles,
  MessagesSquare,
  Shield,
  BookOpen,
  ArrowLeft,
  Briefcase,
  Handshake,
  Rocket,
} from "lucide-react";
import CatalogIcon from "@/components/icons/CatalogIcon";
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
import { useProfile } from "@/hooks/useProfile";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";

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
          <DropdownMenuItem onClick={() => go("/portfolio")} className="rounded-lg">
            <FolderKanban className="w-4 h-4 mr-2" /> Works
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/dashboard")} className="rounded-lg">
            <Briefcase className="w-4 h-4 mr-2" /> คำขอจ้างงาน
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/dashboard/collab")} className="rounded-lg">
            <Handshake className="w-4 h-4 mr-2" /> คำขอคอลแลป
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/portfolio?tab=catalog")} className="rounded-lg">
            <CatalogIcon className="w-4 h-4 mr-2" /> Catalogs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/portfolio?tab=collections")} className="rounded-lg">
            <Layers3 className="w-4 h-4 mr-2" /> Collections
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/portfolio?tab=inspire")} className="rounded-lg">
            <Sparkles className="w-4 h-4 mr-2" /> Inspiration
          </DropdownMenuItem>
          {!isAplus1LaunchMinimal() ? (
            <DropdownMenuItem onClick={() => go("/earnings")} className="rounded-lg">
              <Coins className="w-4 h-4 mr-2 text-primary" /> รายได้ &amp; กระเป๋า Pixel
            </DropdownMenuItem>
          ) : null}
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
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5 space-y-1" onPointerDown={preventClose}>
        <ThemeModePicker label="Theme" />
        {variant !== "forum" ? <FeedGridDensityPicker label="Grid Feed" /> : null}
      </div>
      <DropdownMenuSeparator />
      {variant !== "forum" ? (
        <>
          {!isVerified ? (
            <DropdownMenuItem onClick={() => go("/hire/start")} className="rounded-lg">
              <Rocket className="w-4 h-4 mr-2 text-primary" /> Become a Creator
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => {
              window.open("/forum", "_blank", "noopener,noreferrer");
              onNavigate?.();
            }}
            className="rounded-lg"
          >
            <MessagesSquare className="w-4 h-4 mr-2" /> กระทู้ชุมชน
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuItem onClick={() => go("/settings")} className="rounded-lg">
        <Settings className="w-4 h-4 mr-2" /> ตั้งค่า
      </DropdownMenuItem>
      {variant === "forum" && isAdmin ? (
        <DropdownMenuItem onClick={() => go("/forum/admin")} className="rounded-lg">
          <Shield className="w-4 h-4 mr-2 text-primary" /> แอดมินฟอรัม
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => void signOut()} className="rounded-lg text-destructive focus:text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
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

import type { PointerEvent, ReactNode } from "react";
import {
  User,
  LogOut,
  Settings,
  Layers3,
  Coins,
  FolderKanban,
  Library,
  Sparkles,
  MessagesSquare,
  Shield,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeModePicker } from "@/components/settings/ThemeModePicker";
import { FeedGridDensityPicker } from "@/components/feed/FeedGridDensityPicker";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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
  const { data: isAdmin } = useIsAdmin();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(variant === "forum" ? "/forum" : "/");
    onNavigate?.();
  };

  return (
    <>
      <DropdownMenuItem onClick={() => go(variant === "forum" ? "/forum/me" : "/portfolio")} className="rounded-lg">
        <User className="w-4 h-4 mr-2" />{" "}
        {variant === "forum" ? "โปรไฟล์ชุมชนของฉัน" : "โปรไฟล์ของฉัน"}
      </DropdownMenuItem>
      {variant !== "forum" ? (
        <>
          <DropdownMenuItem onClick={() => go("/portfolio/manage")} className="rounded-lg">
            <FolderKanban className="w-4 h-4 mr-2" /> แดชบอร์ด &amp; จัดการ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/series")} className="rounded-lg">
            <Library className="w-4 h-4 mr-2" /> ชุดผลงานของฉัน
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/collections")} className="rounded-lg">
            <Layers3 className="w-4 h-4 mr-2" /> คอลเลกชันของฉัน
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/inspire")} className="rounded-lg">
            <Sparkles className="w-4 h-4 mr-2" /> My Inspire
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
        <DropdownMenuItem
          onClick={() => {
            window.open("/forum", "_blank", "noopener,noreferrer");
            onNavigate?.();
          }}
          className="rounded-lg"
        >
          <MessagesSquare className="w-4 h-4 mr-2" /> กระทู้ชุมชน
        </DropdownMenuItem>
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
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("w-60 rounded-xl glass-panel-strong", contentClassName)}
      >
        <ProfileMenuContent variant={variant} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

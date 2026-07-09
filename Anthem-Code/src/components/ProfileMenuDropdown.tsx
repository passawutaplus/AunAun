import type { PointerEvent, ReactNode } from "react";
import { User, LogOut, Settings, Layers3, Coins, FolderKanban } from "lucide-react";
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
import { AreaFeedLayoutPicker } from "@/components/community/AreaFeedLayoutPicker";
import { cn } from "@/lib/utils";

function preventClose(e: PointerEvent) {
  e.preventDefault();
}

type ProfileMenuContentProps = {
  onNavigate?: () => void;
};

export function ProfileMenuContent({ onNavigate }: ProfileMenuContentProps) {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    onNavigate?.();
  };

  return (
    <>
      <DropdownMenuItem onClick={() => go("/portfolio")} className="rounded-lg">
        <User className="w-4 h-4 mr-2" /> โปรไฟล์ของฉัน
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => go("/portfolio/manage")} className="rounded-lg">
        <FolderKanban className="w-4 h-4 mr-2" /> แดชบอร์ด &amp; จัดการ
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => go("/collections")} className="rounded-lg">
        <Layers3 className="w-4 h-4 mr-2" /> คอลเลกชันของฉัน
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => go("/earnings")} className="rounded-lg">
        <Coins className="w-4 h-4 mr-2 text-primary" /> รายได้ &amp; กระเป๋า Pixel
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5 space-y-1" onPointerDown={preventClose}>
        <ThemeModePicker label="Theme" />
        <FeedGridDensityPicker label="ฟีดผลงาน" />
        <AreaFeedLayoutPicker />
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => go("/settings")} className="rounded-lg">
        <Settings className="w-4 h-4 mr-2" /> ตั้งค่า
      </DropdownMenuItem>
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
};

export function ProfileMenuDropdown({
  trigger,
  contentClassName,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  onOpenChange,
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
        <ProfileMenuContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

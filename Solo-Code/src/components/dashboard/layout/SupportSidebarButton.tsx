import { LifeBuoy } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const MENU_BTN =
  "gap-2.5 text-white hover:bg-white/15 hover:text-white data-[active=true]:bg-white/25 data-[active=true]:text-white";

export function SupportSidebarButton({
  collapsed,
  onOpen,
}: {
  collapsed: boolean;
  onOpen: () => void;
}) {
  return (
    <SidebarMenuButton
      tooltip="Help"
      className={cn(MENU_BTN, "w-full justify-center")}
      onClick={onOpen}
    >
      <LifeBuoy className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="text-xs font-medium truncate">Help</span>}
    </SidebarMenuButton>
  );
}

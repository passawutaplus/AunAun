import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import StudioSearch from "@/components/dashboard/StudioSearch";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStudioBadges } from "@/hooks/useStudioBadges";
import { studioNavGroups, type StudioNavItem } from "@/lib/studioNav";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onNavigate?: () => void;
  /** Icon-only rail (desktop). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

/** My Studio back-office sidebar — full height, grouped sections, live badges. */
export default function StudioSidebar({ className, onNavigate, collapsed = false, onToggleCollapsed }: Props) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const badges = useStudioBadges();

  return (
    <nav aria-label="เมนู My Studio" className={cn("flex h-full flex-col", className)}>
      <div className={cn("flex items-center gap-2.5 px-3 pb-3 pt-4", collapsed && "justify-center px-0")}>
        <UserAvatar
          src={profile?.avatar_url}
          name={profile?.display_name}
          username={profile?.username}
          className="h-9 w-9 shrink-0"
          fallbackClassName="text-xs"
        />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">My Studio</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.username ? `@${profile.username}` : profile?.display_name ?? ""}
            </p>
          </div>
        )}
      </div>

      <div className="px-2 pb-1">
        <StudioSearch compact={collapsed} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        {studioNavGroups().map((group) => (
          <div key={group.id}>
            {group.label && !collapsed ? (
              <p className="px-2.5 pb-1 text-[11px] font-medium text-muted-foreground">{group.label}</p>
            ) : group.label ? (
              <div className="mx-3 mb-2 border-t border-border/70" aria-hidden />
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <SidebarLink
                    item={item}
                    count={item.badge ? badges[item.badge] : 0}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-border/70 px-2 py-3">
        <Link
          to="/portfolio/new"
          onClick={onNavigate}
          title={collapsed ? "ลงผลงานใหม่" : undefined}
          className={cn(
            "mb-1.5 flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90",
          )}
        >
          <Plus className="h-4 w-4" />
          {collapsed ? <span className="sr-only">ลงผลงานใหม่</span> : "ลงผลงานใหม่"}
        </Link>
        <SidebarLink
          item={{ id: "settings", to: "/settings", label: "ตั้งค่า", heroTitle: "", hint: "", icon: Settings, end: false }}
          count={0}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <SidebarLink
          item={{ id: "site", to: "/", label: "กลับหน้าเว็บ", heroTitle: "", hint: "", icon: ArrowLeft, end: true }}
          count={0}
          collapsed={collapsed}
          onNavigate={onNavigate}
          plain
        />
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {collapsed ? null : "ย่อเมนู"}
          </button>
        ) : null}
      </div>
    </nav>
  );
}

function SidebarLink({
  item,
  count,
  collapsed,
  onNavigate,
  plain = false,
}: {
  item: StudioNavItem;
  count: number;
  collapsed: boolean;
  onNavigate?: () => void;
  /** Never shows as active (e.g. "back to site"). */
  plain?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center px-0",
          isActive && !plain
            ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/10 dark:ring-white/10"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        )
      }
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {count > 0 ? (
        <span
          className={cn(
            "rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold leading-[18px] text-white",
            collapsed && "absolute right-1 top-0.5 min-w-[18px] px-1 text-center text-[10px] leading-4",
          )}
          aria-label={`${count} รายการ`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </NavLink>
  );
}

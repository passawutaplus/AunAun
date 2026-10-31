import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
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
      <div className={cn("flex items-center gap-2.5 px-3 pb-3 pt-5", collapsed && "flex-col px-0")}>
        <img src="/brand/symbol-black.svg" alt="" className="h-8 w-8 shrink-0 dark:hidden" />
        <img src="/brand/symbol-white.svg" alt="" className="hidden h-8 w-8 shrink-0 dark:block" />
        {collapsed ? null : <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">My Studio</p>}
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground dark:hover:bg-white/10"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {studioNavGroups().map((group) => (
          <div key={group.id}>
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-xs text-muted-foreground">{group.label}</p>
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

      <div className="space-y-0.5 px-3 py-3">
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
        <Link
          to={profile?.username ? `/@${profile.username}` : user ? `/u/${user.id}` : "/"}
          onClick={onNavigate}
          title={collapsed ? "ดูโปรไฟล์" : undefined}
          className={cn("!mt-2 flex items-center gap-2.5 rounded-2xl p-2 transition-colors", collapsed ? "justify-center" : "bg-card dark:bg-white/10")}
        >
          <UserAvatar
            src={profile?.avatar_url}
            name={profile?.display_name}
            username={profile?.username}
            className="h-9 w-9 shrink-0"
            fallbackClassName="text-xs"
          />
          {collapsed ? null : (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-foreground">{profile?.display_name || "My Studio"}</span>
              {profile?.username ? <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span> : null}
            </span>
          )}
        </Link>
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
          "relative flex h-10 items-center gap-3 rounded-[14px] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center px-0",
          isActive && !plain
            ? "bg-card font-medium text-foreground dark:bg-white/10"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {count > 0 ? (
        <span
          className={cn(
            "rounded-full bg-foreground px-1.5 text-[11px] font-semibold leading-[18px] text-background",
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

import BriefcaseIcon from "./icons/BriefcaseIcon";

import { Home, MessageCircle, Orbit, Plus, User } from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";

import { useAuthDialog } from "@/stores/authDialogStore";

import { useAppLayout } from "@/hooks/useAppLayout";

import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";

import NotificationBell from "@/components/notifications/NotificationBell";
import { useChatInboxBadgeCount } from "@/hooks/useChat";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string, mode: string | null) => boolean;
  requiresAuth?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Home",
    icon: Home,
    match: (p, mode) => p === "/" && mode !== "community",
  },
  {
    to: "/?mode=community",
    label: "Area",
    icon: Orbit,
    match: (p, mode) => p === "/" && mode === "community",
  },
  { to: "/jobs", label: "Jobs", icon: BriefcaseIcon, match: (p) => p.startsWith("/jobs") },
  { to: "/chat", label: "Chat", icon: MessageCircle, match: (p) => p.startsWith("/chat"), requiresAuth: true },
];

const launchNavItems = NAV_ITEMS.filter((item) => item.to === "/" || item.to === "/chat");

const PROFILE_MATCH = (p: string) =>
  p.startsWith("/portfolio") || p.startsWith("/settings") || p.startsWith("/collections");

const FloatingNav = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const feedMode = new URLSearchParams(search).get("mode");
  const { user } = useAuth();
  const { data: myProfile } = useProfile(user?.id);
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { showBottomNav } = useAppLayout();
  const { data: chatBadgeCount = 0 } = useChatInboxBadgeCount();

  if (!showBottomNav) return null;

  const guardAuth = (e: React.MouseEvent, requiresAuth?: boolean, dest?: string) => {
    if (requiresAuth && !user) {
      e.preventDefault();
      openAuth(dest);
    }
  };

  const openCreate = () => {
    if (!user) {
      openAuth("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  /** Mobile/tablet: always land on default projects feed (even when re-tapping Home). */
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { replace: true, state: { feedHomeReset: Date.now() } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notificationsActive = pathname.startsWith("/notifications");
  const navItems = isAplus1LaunchMinimal() ? launchNavItems : NAV_ITEMS;

  return (
    <>
      <nav
        aria-label="เมนูหลัก"
        className="lg:hidden fixed inset-x-0 z-30 flex items-center justify-center gap-3 px-4 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-0.5 rounded-full",
            "border border-border/80 bg-background/90 px-1.5 py-1.5 shadow-lg shadow-black/25",
            "dark:border-border dark:bg-card/90 dark:shadow-black/50",
            "backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 dark:supports-[backdrop-filter]:bg-card/80",
          )}
          style={{ WebkitBackdropFilter: "blur(20px)" }}
        >
          {navItems.map(({ to, label, icon: Icon, match, requiresAuth }) => {
            const active = match(pathname, feedMode);
            const showChatBadge = to === "/chat" && user && chatBadgeCount > 0;
            const isHome = to === "/";
            const homeActive = isHome && pathname === "/" && feedMode !== "community";

            if (isHome) {
              return (
                <button
                  key={to}
                  type="button"
                  onClick={goHome}
                  aria-label={label}
                  aria-current={homeActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-center rounded-full transition-colors min-h-11",
                    homeActive
                      ? "gap-1.5 bg-foreground text-background px-2.5 py-2 text-[11px] font-medium"
                      : "p-2 text-muted-foreground hover:text-foreground hover:bg-accent w-10 min-h-10",
                  )}
                >
                  <Icon className={cn("shrink-0", homeActive ? "w-4 h-4" : "w-5 h-5")} strokeWidth={homeActive ? 2.2 : 2} />
                  {homeActive && <span className="whitespace-nowrap max-w-[4.5rem] truncate">{label}</span>}
                </button>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                onClick={(e) => {
                  if (to === "/?mode=community") {
                    localStorage.setItem("feed-mode", "community");
                  }
                  guardAuth(e, requiresAuth, to);
                }}
                aria-label={showChatBadge ? `${label} (${chatBadgeCount} รายการใหม่)` : label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-colors min-h-11",
                  active
                    ? "gap-1.5 bg-foreground text-background px-2.5 py-2 text-[11px] font-medium"
                    : "p-2 text-muted-foreground hover:text-foreground hover:bg-accent w-10 min-h-10",
                )}
              >
                <Icon className={cn("shrink-0", active ? "w-4 h-4" : "w-5 h-5")} strokeWidth={active ? 2.2 : 2} />
                {showChatBadge && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-white text-[9px] font-semibold flex items-center justify-center leading-none">
                    {chatBadgeCount > 99 ? "99+" : chatBadgeCount}
                  </span>
                )}
                {active && <span className="whitespace-nowrap max-w-[4.5rem] truncate">{label}</span>}
              </NavLink>
            );
          })}

          <NotificationBell variant="nav" active={notificationsActive} />

          {user ? (
            <ProfileMenuDropdown
              side="top"
              align="end"
              sideOffset={12}
              trigger={
                <button
                  type="button"
                  aria-label="Profile"
                  aria-haspopup="menu"
                  className={cn(
                    "flex items-center justify-center rounded-full transition-colors min-h-11",
                    PROFILE_MATCH(pathname)
                      ? "gap-1.5 bg-foreground text-background px-2.5 py-2 text-[11px] font-medium"
                      : "p-2 text-muted-foreground hover:text-foreground hover:bg-accent w-10 min-h-10",
                  )}
                >
                  <UserAvatar
                    src={myProfile?.avatar_url}
                    name={myProfile?.display_name ?? user.email ?? "U"}
                    className={cn(
                      "shrink-0 ring-2 ring-background",
                      PROFILE_MATCH(pathname) ? "w-6 h-6" : "w-7 h-7",
                    )}
                    fallbackClassName={PROFILE_MATCH(pathname) ? "text-[10px]" : "text-xs"}
                  />
                  {PROFILE_MATCH(pathname) && (
                    <span className="whitespace-nowrap max-w-[4.5rem] truncate">Profile</span>
                  )}
                </button>
              }
            />
          ) : (
            <button
              type="button"
              aria-label="Profile"
              onClick={() => openAuth("/portfolio")}
              className="flex items-center justify-center rounded-full transition-colors min-h-11 p-2 text-muted-foreground hover:text-foreground hover:bg-accent w-10 min-h-10"
            >
              <User className="w-5 h-5 shrink-0" strokeWidth={2} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openCreate}
          aria-label="สร้างเนื้อหาใหม่"
          className={cn(
            "pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-brand text-white shadow-lg shadow-primary/25",
            "hover:opacity-90 active:scale-95 transition-all",
          )}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </nav>
    </>
  );
};

export default FloatingNav;

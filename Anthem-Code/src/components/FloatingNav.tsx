import BriefcaseIcon from "./icons/BriefcaseIcon";

import { Fragment, useLayoutEffect, useState } from "react";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { isAplus1HiringBoardEnabled, isAplus1LaunchMinimal } from "@/lib/aplus1Launch";

import { useAuthDialog } from "@/stores/authDialogStore";

import { useAppLayout } from "@/hooks/useAppLayout";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";

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
    match: (p) => p === "/",
  },
  { to: "/hiring", label: "งาน", icon: BriefcaseIcon, match: (p) => p.startsWith("/hiring") },
  { to: "/chat", label: "Chat", icon: MessageCircle, match: (p) => p.startsWith("/chat"), requiresAuth: true },
];

const launchNavItems = NAV_ITEMS.filter((item) => item.to === "/" || item.to === "/chat");

const PROFILE_MATCH = (p: string) =>
  p.startsWith("/portfolio") || p.startsWith("/settings") || p.startsWith("/collections");

/** Gap between the pill and the round search button, and the button's diameter (h-14). */
const SEARCH_GAP = 12;
const SEARCH_SIZE = 56;

/**
 * Outline of pill + a liquid "neck" + the round search button, as one shape. Both caps are
 * circles; the neck leaves each cap at 50° on its tangent so the joint stays smooth.
 */
function glassOutline(w: number, h: number): string {
  const R = h / 2;
  const r = SEARCH_SIZE / 2;
  const cy = h / 2;
  const c1x = w - R;
  const c2x = w + SEARCH_GAP + r;
  const t = (50 * Math.PI) / 180;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const p1 = [c1x + R * cos, cy - R * sin];
  const p2 = [c1x + R * cos, cy + R * sin];
  const q1 = [c2x - r * cos, cy - r * sin];
  const q2 = [c2x - r * cos, cy + r * sin];
  const k = (q1[0] - p1[0]) / 2;
  const n = (v: number) => v.toFixed(2);
  return [
    `M ${n(R)} 0 L ${n(c1x)} 0`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(p1[0])} ${n(p1[1])}`,
    `C ${n(p1[0] + k * sin)} ${n(p1[1] + k * cos)} ${n(q1[0] - k * sin)} ${n(q1[1] + k * cos)} ${n(q1[0])} ${n(q1[1])}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(q2[0])} ${n(q2[1])}`,
    `C ${n(q2[0] - k * sin)} ${n(q2[1] - k * cos)} ${n(p2[0] + k * sin)} ${n(p2[1] - k * cos)} ${n(p2[0])} ${n(p2[1])}`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(c1x)} ${n(h)} L ${n(R)} ${n(h)}`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(R)} 0 Z`,
  ].join(" ");
}

/** Frosted-glass background shared by the pill and the search button (sized from the pill). */
function NavGlass({ pill }: { pill: HTMLDivElement | null }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = pill;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pill]);

  if (!size || size.w === 0) return null;
  const width = size.w + SEARCH_GAP + SEARCH_SIZE;
  const d = glassOutline(size.w, size.h);

  return (
    <div aria-hidden className="pointer-events-none absolute left-0 top-0" style={{ width, height: size.h }}>
      <div
        className="absolute inset-0 bg-background/65 backdrop-blur-xl backdrop-saturate-150 dark:bg-card/50"
        style={{ clipPath: `path('${d}')` }}
      />
      <svg className="absolute inset-0 overflow-visible" width={width} height={size.h}>
        <path d={d} fill="none" className="stroke-foreground/15" strokeWidth={1} />
      </svg>
    </div>
  );
}

const FloatingNav = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const feedMode = new URLSearchParams(search).get("mode");
  const { user } = useAuth();
  const { data: myProfile } = useProfile(user?.id);
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { showBottomNav } = useAppLayout();
  const { data: chatBadgeCount = 0 } = useChatInboxBadgeCount();
  const [pillEl, setPillEl] = useState<HTMLDivElement | null>(null);

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
  /** Create (+) sits in the pill just before Chat; guests never see it — creating needs an account. */
  const createActive = pathname.startsWith("/portfolio/new");
  const createButton = (
    <button
      type="button"
      onClick={openCreate}
      data-tour="create"
      aria-label="ลงผลงาน"
      className={cn(
        "relative flex items-center justify-center rounded-full transition-colors h-11 w-11 min-h-11",
        createActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <Plus className="h-5 w-5 shrink-0" strokeWidth={2.2} />
    </button>
  );

  /** Phones / tablets: the round button opens project search (with colour search inside). */
  const openSearch = () => {
    const homeNav = useFeedHomeNavStore.getState();
    if (pathname === "/" && homeNav.active && homeNav.onFilterClick) {
      homeNav.onFilterClick();
      return;
    }
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { state: { feedHomeReset: Date.now(), openProjectSearch: Date.now() } });
  };

  /** Mobile/tablet: always land on default projects feed (even when re-tapping Home). */
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { replace: true, state: { feedHomeReset: Date.now() } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notificationsActive = pathname.startsWith("/notifications");
  const navItems = (isAplus1LaunchMinimal() ? launchNavItems : NAV_ITEMS).filter(
    (item) =>
      !(item.requiresAuth && !user) &&
      (item.to !== "/hiring" || isAplus1HiringBoardEnabled()),
  );

  return (
    <>
      <nav
        aria-label="เมนูหลัก"
        className="lg:hidden fixed inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="relative flex items-center" style={{ gap: SEARCH_GAP }}>
        <NavGlass pill={pillEl} />
        <div
          ref={setPillEl}
          className="pointer-events-auto relative flex items-center gap-0.5 rounded-full px-1.5 py-1.5"
        >
          {navItems.map(({ to, label, icon: Icon, match, requiresAuth }) => {
            const active = match(pathname, feedMode);
            const showChatBadge = to === "/chat" && user && chatBadgeCount > 0;
            const isHome = to === "/";
            const homeActive = isHome && pathname === "/";

            if (isHome) {
              return (
                <button
                  key={to}
                  type="button"
                  onClick={goHome}
                  aria-label={label}
                  aria-current={homeActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-center rounded-full transition-colors h-11 w-11 min-h-11",
                    homeActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={homeActive ? 2.2 : 2} />
                </button>
              );
            }

            return (
              <Fragment key={to}>
              {to === "/chat" && user ? createButton : null}
              <NavLink
                to={to}
                onClick={(e) => {
                  guardAuth(e, requiresAuth, to);
                }}
                aria-label={showChatBadge ? `${label} (${chatBadgeCount} รายการใหม่)` : label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-colors h-11 w-11 min-h-11",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 2} />
                {showChatBadge && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center leading-none">
                    {chatBadgeCount > 99 ? "99+" : chatBadgeCount}
                  </span>
                )}
              </NavLink>
              </Fragment>
            );
          })}

          {user && <NotificationBell variant="nav" active={notificationsActive} />}

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
                  aria-current={PROFILE_MATCH(pathname) ? "page" : undefined}
                  className="flex h-11 w-11 min-h-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <UserAvatar
                    src={myProfile?.avatar_url}
                    name={myProfile?.display_name ?? user.email ?? "U"}
                    className="h-7 w-7 shrink-0"
                    fallbackClassName="text-xs"
                  />
                </button>
              }
            />
          ) : (
            <button
              type="button"
              aria-label="Profile"
              onClick={() => openAuth("/portfolio")}
              className="flex h-11 w-11 min-h-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <User className="w-5 h-5 shrink-0" strokeWidth={2} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openSearch}
          data-tour="search"
          aria-label="ค้นหาผลงาน"
          // Sits on the shared glass (NavGlass); no background of its own.
          className="pointer-events-auto relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-foreground transition-transform duration-200 ease-out active:scale-95"
        >
          <Search className="h-6 w-6" strokeWidth={2.25} />
        </button>
        </div>
      </nav>
    </>
  );
};

export default FloatingNav;

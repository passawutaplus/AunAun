import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Plus, User } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import ChatNavButton from "@/components/chat/ChatNavButton";
import JobsNavButton from "@/components/jobs/JobsNavButton";
import { CommunityNavDropdown } from "@/components/CommunityNavDropdown";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";
import { useAuthDialog } from "@/stores/authDialogStore";
import { BRAND_NAME } from "@/lib/brandConfig";
import { supabase } from "@/integrations/supabase/client";
import { isPortfolioEditorRoute } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";

/** Public creator profile: `/u/:id` or vanity `/@handle`. */
function isPublicProfilePath(pathname: string): boolean {
  return pathname.startsWith("/u/") || pathname.startsWith("/@");
}

/** Site chrome: home feed + Learn / Help / Forum / dashboard / profile / settings. */
function shouldShowDesktopTopNav(pathname: string): boolean {
  if (isPortfolioEditorRoute(pathname)) return false;
  return (
    pathname === "/" ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/forum") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/earnings") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/settings") ||
    isPublicProfilePath(pathname) ||
    pathname.startsWith("/verify")
  );
}

/** Shared translucent glass for sticky top bars. */
export const DESKTOP_TOP_NAV_GLASS =
  "border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm font-medium transition-colors whitespace-nowrap",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

const NAV_H = 56;

/** True once the first visual row of feed cards has moved fully above the viewport. */
function firstFeedRowCleared(grid: HTMLElement): boolean {
  const kids = [...grid.children] as HTMLElement[];
  if (kids.length === 0) return false;
  const origin = kids.reduce((min, el) => Math.min(min, el.offsetTop), Number.POSITIVE_INFINITY);
  let rowBottom = Number.NEGATIVE_INFINITY;
  let found = false;
  for (const el of kids) {
    if (el.offsetTop > origin + 2) continue;
    found = true;
    const bottom = el.getBoundingClientRect().bottom;
    if (bottom > rowBottom) rowBottom = bottom;
  }
  if (!found) return kids[0].getBoundingClientRect().bottom <= 0;
  return rowBottom <= 0;
}

/**
 * Desktop top bar — sticky site chrome on home and inner pages.
 */
const DesktopTopNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const isHome = pathname === "/";
  const isLearn = pathname.startsWith("/learn");
  const feedNav = useFeedHomeNavStore();
  const scrolled = isHome && feedNav.scrolled;
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  const onShareProject = () => {
    if (!user) {
      openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  useEffect(() => {
    if (!isHome) {
      document.querySelector<HTMLElement>("[data-desktop-top-nav]")?.style.removeProperty("top");
      useFeedHomeNavStore.getState().setScrolled(false);
      return;
    }

    let modeTitleThreshold = 0;
    /** Scroll position where the catalog sheet becomes the full page. */
    let flushAnchor: number | null = null;

    const releaseNavWithPage = () => {
      const header = document.querySelector<HTMLElement>("[data-desktop-top-nav]");
      if (!header) return;
      const sheet = document.querySelector<HTMLElement>("[data-feed-sheet]");
      if (!sheet) {
        flushAnchor = null;
        header.style.removeProperty("top");
        return;
      }
      const sheetTop = sheet.getBoundingClientRect().top;
      if (sheetTop <= 1) {
        if (flushAnchor == null) flushAnchor = window.scrollY;
      } else if (sheetTop > 48) {
        flushAnchor = null;
      }
      const shift = flushAnchor == null ? 0 : Math.max(0, window.scrollY - flushAnchor);
      // Once the full catalog is on screen, let this bar leave with the page
      // instead of staying pinned to the viewport.
      if (shift > 0) header.style.top = `-${shift}px`;
      else header.style.removeProperty("top");
    };

    const update = () => {
      releaseNavWithPage();
      const title = document.querySelector<HTMLElement>("[data-feed-mode-title]");
      if (title) {
        const state = useFeedHomeNavStore.getState();
        if (!state.scrolled) {
          modeTitleThreshold = title.getBoundingClientRect().bottom + window.scrollY;
        }
        state.setScrolled(modeTitleThreshold > 0 && window.scrollY >= modeTitleThreshold - 0.5);
        return;
      }
      const sheet = document.querySelector<HTMLElement>("[data-feed-sheet]");
      if (sheet) {
        const grid = sheet.querySelector<HTMLElement>("[data-feed-results]");
        useFeedHomeNavStore.getState().setScrolled(grid ? firstFeedRowCleared(grid) : false);
        return;
      }
      const hero = document.querySelector<HTMLElement>("[data-feed-hero]");
      if (hero) {
        useFeedHomeNavStore.getState().setScrolled(hero.getBoundingClientRect().bottom <= NAV_H);
        return;
      }
      const toolbar = document.querySelector<HTMLElement>("[data-feed-toolbar]");
      if (toolbar) {
        useFeedHomeNavStore.getState().setScrolled(toolbar.getBoundingClientRect().top <= NAV_H);
        return;
      }
      useFeedHomeNavStore.getState().setScrolled(window.scrollY > 8);
    };

    // One layout read per frame instead of one per scroll event.
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      document.querySelector<HTMLElement>("[data-desktop-top-nav]")?.style.removeProperty("top");
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [isHome]);

  if (!shouldShowDesktopTopNav(pathname) || isLearn) return null;
  // On home after the hero, the feed bar slides down over this chrome.
  // Keep the bar mounted so the page does not jump by a nav-height.
  const coveredByFeedBar = isHome && scrolled;

  const goHome = () => {
    if (pathname !== "/") {
      navigate("/");
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    useFeedHomeNavStore.getState().setScrolled(false);
  };

  /** Guest home: marketing chrome — nav sits with the right cluster. */
  const isGuestHome = isHome && !user;

  // Home over hero: fully clear (no glass bar). Other site pages keep sticky glass chrome.
  const glass = !isHome && !isLearn;

  const mainNav = (
    <nav
      className={cn("flex min-w-0 items-center", isGuestHome ? "gap-6 xl:gap-8" : "gap-6")}
      aria-label="เมนูหลัก"
    >
      <CommunityNavDropdown className={isHome ? "text-[#f5f5f5]/80 hover:text-[#f5f5f5]" : undefined} />
      <NavLink
        to="/learn"
        end={false}
        className={isHome ? "text-[13px] font-medium text-[#f5f5f5] transition-opacity hover:opacity-70" : linkClass}
      >
        About
      </NavLink>
    </nav>
  );

  return (
    <header
      data-desktop-top-nav
      data-scrolled={glass ? "true" : "false"}
      inert={coveredByFeedBar ? "" : undefined}
      aria-hidden={coveredByFeedBar || undefined}
      className={cn(
        "z-40 hidden lg:block sticky top-0 transition-opacity duration-300 motion-reduce:transition-none",
        coveredByFeedBar && "pointer-events-none opacity-0",
        isLearn
          ? "border-b border-[#e4e1db] bg-[#f5f5f5] text-[#2f2e2c] shadow-none"
          : isHome
            ? "border-0 bg-transparent text-[#2f2e2c] shadow-none"
            : glass
              ? DESKTOP_TOP_NAV_GLASS
              : "border-0 bg-transparent shadow-none",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
        {isPublicProfilePath(pathname) ? (
          <BackButton fallbackTo="/" label="Back" className="border-border/60 bg-background/60" />
        ) : null}
        <button
          type="button"
          onClick={goHome}
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${BRAND_NAME} หน้าแรก`}
        >
          <BrandLogo size="sm" tone={isHome || isLearn ? "ink" : "brand"} />
        </button>

        {!isHome && !isGuestHome ? mainNav : null}

        <div className="ml-auto flex shrink-0 items-center gap-4 xl:gap-5">
          {isHome ? (
            <NavLink
              to="/learn"
              className="text-[13px] font-medium text-[#2f2e2c] transition-opacity hover:opacity-70"
            >
              Get in Touch
            </NavLink>
          ) : isGuestHome ? (
            mainNav
          ) : null}
          {isHome ? null : (
            <button
              type="button"
              onClick={onShareProject}
              aria-label="ลงผลงานใหม่"
              className={cn(
                "group relative hidden h-9 items-center overflow-visible rounded-full sm:inline-flex",
                "bg-foreground px-1.5",
              )}
            >
              <span
                className={cn(
                  "relative z-10 inline-flex h-full items-center gap-2 rounded-full py-0 pl-1.5 pr-3.5 text-sm font-medium",
                  "bg-transparent text-background",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    "bg-background text-foreground",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="whitespace-nowrap">ลงผลงานใหม่</span>
              </span>
            </button>
          )}
          <JobsNavButton />
          {user && (
            <>
              <ChatNavButton />
              <NotificationBell />
            </>
          )}
          {user ? (
            <ProfileMenuDropdown
              trigger={
                <button
                  type="button"
                  aria-label="โปรไฟล์"
                  className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-accent/60"
                >
                  <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.display_name}
                    username={profile?.username}
                    className="h-8 w-8"
                    fallbackClassName="text-xs"
                  />
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              }
            />
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => navigate("/auth")}
              className={
                isHome || isLearn
                  ? "h-8 rounded-sm bg-[#2f2e2c] px-3 text-[13px] font-normal text-[#f5f5f5] hover:bg-[#2f2e2c]/90"
                  : "h-8 rounded-full bg-foreground px-4 text-[13px] font-normal text-background hover:bg-foreground/90"
              }
            >
              เข้าสู่ระบบ
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopTopNav;

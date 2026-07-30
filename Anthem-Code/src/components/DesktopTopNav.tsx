import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Rocket, User } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import ChatNavButton from "@/components/chat/ChatNavButton";
import { CommunityNavDropdown } from "@/components/CommunityNavDropdown";
import FeedModeDropdown from "@/components/feed/FeedModeDropdown";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";
import { useAuthDialog } from "@/stores/authDialogStore";
import { BRAND_NAME } from "@/lib/brandConfig";
import type { FeedFilter } from "@/data/projectTypes";
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

function isStickySiteChromePath(pathname: string): boolean {
  if (isPortfolioEditorRoute(pathname)) return false;
  return (
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

/** Shared translucent glass for sticky top bars (non-home). */
export const DESKTOP_TOP_NAV_GLASS =
  "border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30";

/** Alias for older call sites / stale HMR (`isLearnOrHelpPath is not defined`). */
function isLearnOrHelpPath(pathname: string): boolean {
  return isStickySiteChromePath(pathname);
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm font-medium transition-colors whitespace-nowrap",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

const NAV_H = 56;

/**
 * Desktop top bar — home hero (absolute, scrolls away) or sticky glass chrome on other site pages.
 */
const DesktopTopNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const isHome = pathname === "/";
  const siteChrome = isLearnOrHelpPath(pathname);
  const feedNav = useFeedHomeNavStore();
  const scrolled = isHome && feedNav.scrolled;
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
    is_verified: boolean | null;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url, display_name, username, is_verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  const showBecomeCreator = !user || !profile?.is_verified;

  const onBecomeCreator = () => {
    if (!user) {
      openSignup("/hire/start");
      return;
    }
    navigate("/hire/start");
  };

  useEffect(() => {
    if (!isHome) {
      useFeedHomeNavStore.getState().setScrolled(false);
      return;
    }

    const update = () => {
      const hero = document.querySelector<HTMLElement>("[data-feed-hero]");
      if (hero) {
        // Morph once hero has cleared the top — under-hero toolbar becomes sticky chrome.
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

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHome]);

  if (!shouldShowDesktopTopNav(pathname)) return null;
  // On home after hero: FeedToolbar becomes the fixed chrome (logo + search + actions).
  if (isHome && scrolled) return null;

  const applyFeedMode = (m: FeedFilter) => {
    const run = (attempt = 0) => {
      const fn = useFeedHomeNavStore.getState().onFeedModeChange;
      if (fn) {
        fn(m);
        window.setTimeout(() => {
          document.querySelector<HTMLElement>("[data-feed-toolbar]")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);
        return;
      }
      if (attempt < 24) window.setTimeout(() => run(attempt + 1), 50);
    };
    run();
  };

  const onExploreModeChange = (m: FeedFilter) => {
    if (!isHome) {
      navigate("/");
      applyFeedMode(m);
      return;
    }
    feedNav.onFeedModeChange?.(m);
    if (m === "Collections") return;

    window.setTimeout(() => {
      document.querySelector<HTMLElement>("[data-feed-toolbar]")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const goHome = () => {
    if (pathname !== "/") {
      navigate("/");
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    useFeedHomeNavStore.getState().setScrolled(false);
  };

  return (
    <header
      data-desktop-top-nav
      data-scrolled={siteChrome ? "true" : "false"}
      className={cn(
        "z-40 hidden lg:block",
        siteChrome
          ? cn("sticky top-0", DESKTOP_TOP_NAV_GLASS)
          : "absolute inset-x-0 top-0 border-b border-transparent bg-transparent",
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
          <BrandLogo size="sm" />
        </button>

        <nav className="flex min-w-0 items-center gap-3" aria-label="เมนูหลัก">
          <FeedModeDropdown
            value={feedNav.active ? feedNav.feedMode : "Explore"}
            onChange={onExploreModeChange}
          />
          <CommunityNavDropdown />
          <NavLink to="/learn" end={false} className={linkClass}>
            Learn more
          </NavLink>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4 xl:gap-5">
          {showBecomeCreator ? (
            <Button
              type="button"
              size="sm"
              onClick={onBecomeCreator}
              className="hidden h-9 gap-1.5 rounded-full bg-gradient-brand px-4 text-white hover:opacity-90 sm:inline-flex"
            >
              <Rocket className="h-4 w-4" aria-hidden />
              Become a Creator
            </Button>
          ) : null}
          <ChatNavButton />
          <NotificationBell />
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
              className="rounded-full bg-gradient-brand text-white hover:opacity-90"
            >
              <User className="mr-1.5 h-4 w-4" />
              เข้าสู่ระบบ
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopTopNav;

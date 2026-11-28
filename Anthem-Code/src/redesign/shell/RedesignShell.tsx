import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useChatInboxBadgeCount } from "@/hooks/useChat";
import { useNotifications } from "@/core/notifications";
import { hasCompletedProfileOnboarding } from "@/hooks/useFeedInterests";
import { getMyOnboarding } from "@/server/queries/account";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { signOutApp } from "@/lib/signOutApp";
import { usePresence } from "../lib/usePresence";
import { actorOf, isShownNotification, toNotificationRow, type NotificationRow } from "../lib/notificationRows";
import { homeEventsQuery } from "../main/useHomeEvents";
import { SC_LINKS, shellPageFor, type ShellPage } from "../routes";
import AccountMenu from "./AccountMenu";
import CalendarPanel from "./CalendarPanel";
import WelcomePanel from "./WelcomePanel";
import NewChooser from "./NewChooser";
import NotificationPanel from "./NotificationPanel";
import SearchPanel from "./SearchPanel";
import { ShellPanelsContext, type ShellPanels } from "./panels";
import logoUrl from "../assets/logo.svg";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/shell.css";
import "../styles/panels.css";
import "../styles/calendar.css";

const FALLBACK: ShellPage = { page: "", tabbar: false, tab: "", footer: true };

const bg = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

/**
 * Frame of the new design: header, footer, floating tab bar on phones, account menu.
 * Pages render their own <main class="sc-main"> through the outlet. None of the old site chrome
 * mounts on these routes (see LegacyChrome in App.tsx). Data comes from the existing hooks only.
 */
export default function RedesignShell({ children }: { children?: ReactNode }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cfg = shellPageFor(pathname) ?? FALLBACK;
  // On the home page the Event tab of the page is the Event button of the tab bar.
  const tab = cfg.page === "main" && new URLSearchParams(search).get("tab") === "event" ? "event" : cfg.tab;

  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  // New account: sign-up step 2 ("Nice to meet you", name + CATEGORY) over the page until it is done.
  const { data: onboarding } = useQuery({
    queryKey: ["sc-onboarding", user?.id],
    queryFn: () => getMyOnboarding(user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const [welcomeHidden, setWelcomeHidden] = useState(false);
  const needsWelcome = !!user && !!onboarding && !hasCompletedProfileOnboarding(onboarding) && !welcomeHidden && cfg.page !== "login";
  const { data: chatUnread = 0 } = useChatInboxBadgeCount();
  const { items: inbox, loading: inboxLoading, markRead, markAllRead } = useNotifications(user?.id);
  // Only the kinds the new design has (no hiring, collab, KYC …); the bell counts the same rows the panel shows.
  const shownInbox = useMemo(() => inbox.filter(isShownNotification), [inbox]);
  const unreadCount = shownInbox.filter((n) => !n.is_read).length;

  // Phone back arrow: one step back inside the site, or the home page when the page was opened directly.
  const goBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const menu = usePresence(180);
  const closeMenu = menu.close;
  const acctRef = useRef<HTMLButtonElement>(null);

  // Search capsule and the "+" chooser: centre popups over a blurred veil, opened from the header or a page.
  const spotlight = usePresence(220);
  const chooser = usePresence(220);
  const { open: openSearch, close: closeSearch } = spotlight;
  const { open: openChooser, close: closeChooser } = chooser;
  const calendar = usePresence(220);
  const { open: openCal, close: closeCal } = calendar;
  const opener = useRef<HTMLElement | null>(null);
  const [spot, setSpot] = useState({ top: "38%", centred: true });

  // Notifications: a small panel under the bell.
  const noti = usePresence(180);
  const { open: openNoti, close: closeNoti } = noti;
  const [notiAt, setNotiAt] = useState({ top: 80, right: 24 });
  const actorIds = useMemo(
    () => (noti.mounted ? [...new Set(shownInbox.map(actorOf).filter((id): id is string => !!id))] : []),
    [noti.mounted, shownInbox],
  );
  const { data: actors } = useProfilesByIds(actorIds);
  const { data: eventRows } = useQuery({
    ...homeEventsQuery,
    enabled: noti.mounted && shownInbox.some((n) => n.kind === "event_reminder"),
  });
  const notiRows = useMemo((): NotificationRow[] => {
    if (!noti.mounted) return [];
    const now = new Date();
    const events = new Map((eventRows ?? []).map((e) => [e.id, e]));
    return shownInbox.map((n) =>
      toNotificationRow(n, {
        now,
        person: (id) => {
          const p = id ? actors?.map[id] : undefined;
          return p ? { name: p.username || p.display_name?.trim() || "", avatar: proxiedImageUrl(p.avatar_url, 96) } : null;
        },
        event: (id) => (id ? events.get(id) ?? null : null),
      }),
    );
  }, [noti.mounted, shownInbox, actors, eventRows]);

  const closePanel = useCallback(
    (restoreFocus = true) => {
      closeSearch();
      closeChooser();
      closeNoti();
      closeCal();
      if (restoreFocus) opener.current?.focus();
    },
    [closeSearch, closeChooser, closeNoti, closeCal],
  );

  const toggleNoti = (el: HTMLElement) => {
    if (noti.isOpen) {
      closePanel();
      return;
    }
    opener.current = el;
    const r = el.getBoundingClientRect();
    setNotiAt({ top: Math.round(r.bottom + 8), right: Math.max(16, Math.round(window.innerWidth - r.right - 8)) });
    closeMenu();
    closeSearch();
    closeChooser();
    openNoti();
  };

  const openNotiRow = (row: NotificationRow) => {
    if (row.unread) void markRead(row.id).catch(() => undefined);
    closePanel(false);
  };

  const panels = useMemo<ShellPanels>(
    () => ({
      openSearch: (el, from) => {
        opener.current = el;
        const vh = window.innerHeight;
        const r = el?.getBoundingClientRect();
        const y = r ? (r.top + r.bottom) / 2 : 0;
        // Mock: on a very tall screen the capsule sits near its button; otherwise 18vh (home) or centred at 38% (header).
        const top =
          from === "main"
            ? vh > 1200 && y ? `${y + 60}px` : "18vh"
            : vh > 1200 && y ? `${Math.max(200, y + 160)}px` : "38%";
        setSpot({ top, centred: from === "header" });
        closeMenu();
        closeChooser();
        closeNoti();
        openSearch();
      },
      openNew: (el) => {
        opener.current = el;
        closeMenu();
        closeSearch();
        closeNoti();
        openChooser();
      },
      openCalendar: (el) => {
        opener.current = el;
        closeMenu();
        closeSearch();
        closeChooser();
        closeNoti();
        openCal();
      },
    }),
    [closeMenu, closeChooser, closeSearch, closeNoti, openSearch, openChooser, openCal],
  );

  // Page background outside .sc-app (overscroll, short pages), while the new frame is on screen.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sc-root");
    return () => root.classList.remove("sc-root");
  }, []);

  useEffect(() => {
    closeMenu();
    closeSearch();
    closeChooser();
    closeNoti();
    closeCal();
  }, [pathname, closeMenu, closeSearch, closeChooser, closeNoti, closeCal]);

  const name = profile?.display_name?.trim() || profile?.username || "";
  const handle = profile?.username || null;
  const avatar = proxiedImageUrl(profile?.avatar_url, 128);
  const current = pathname.startsWith(SC_LINKS.myProfile)
    ? "profile"
    : pathname.startsWith(SC_LINKS.myStudio)
      ? "studio"
      : pathname.startsWith(SC_LINKS.settings)
        ? "settings"
        : "";

  const logOut = async () => {
    closeMenu();
    await signOutApp(queryClient);
    navigate(SC_LINKS.login);
  };

  const closeMenuToButton = () => {
    closeMenu();
    acctRef.current?.focus();
  };

  return (
    <div className="sc-app" data-page={cfg.page || undefined} data-tab={cfg.tabbar ? "on" : "off"} data-header={cfg.header}>
      {cfg.header === "none" ? null : (
        <header className="sc-hd">
          <div className="sc-hd-in">
            {cfg.back ? (
              <Link to={SC_LINKS.home} aria-label="ย้อนกลับ" className="sc-hd-back" onClick={goBack}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </Link>
            ) : null}
            <Link to={SC_LINKS.home} aria-label="samecor. หน้าแรก" className="sc-hd-logo">
              <img src={logoUrl} alt="samecor." />
            </Link>
            <nav aria-label="เมนูบัญชี" className="sc-hd-nav">
              <Link to={SC_LINKS.getInTouch} className="sc-hd-text">Get in Touch</Link>
              {/* On the home page the search button sits in the page (Main) instead. */}
              {cfg.header === "main" ? null : (
                <button
                  type="button"
                  aria-label="ค้นหา"
                  title="ค้นหา"
                  aria-haspopup="dialog"
                  className="sc-ib"
                  onClick={(e) => panels.openSearch(e.currentTarget, "header")}
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M16 16l4 4" />
                  </svg>
                </button>
              )}
              <Link to={SC_LINKS.feedback} aria-label="ส่งฟีดแบ็ก" className="sc-ib sc-hd-fb">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M8.5 14a4 4 0 0 0 7 0" />
                  <path d="M9.5 9.5h.01M14.5 9.5h.01" strokeWidth="2" />
                </svg>
                <span className="sc-lb" aria-hidden="true">Feedback</span>
              </Link>
              {user ? (
                <>
                  <Link to={SC_LINKS.chat} aria-label="แชท" className="sc-ib sc-hd-chat">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
                      <path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    aria-label={unreadCount ? `การแจ้งเตือน ${unreadCount} รายการ` : "การแจ้งเตือน"}
                    aria-haspopup="dialog"
                    aria-expanded={noti.isOpen}
                    className="sc-ib"
                    onClick={(e) => toggleNoti(e.currentTarget)}
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
                      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
                      <path d="M10 20.5a2 2 0 0 0 4 0" />
                    </svg>
                    {unreadCount ? <span aria-hidden="true" className="sc-hd-bd">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                  </button>
                  <button
                    ref={acctRef}
                    type="button"
                    className="sc-hd-acct"
                    aria-label="เมนูบัญชีของฉัน"
                    aria-haspopup="menu"
                    aria-expanded={menu.isOpen}
                    onClick={() => (menu.isOpen ? closeMenu() : menu.open())}
                  >
                    <span aria-hidden="true" className="sc-av" style={bg(avatar)} />
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9.5l6 6 6-6" />
                    </svg>
                  </button>
                </>
              ) : loading ? null : (
                // The mock has no signed-out header yet (question for Beam): plain text link in the existing style.
                <Link to={SC_LINKS.login} className="sc-hd-text">Log In</Link>
              )}
            </nav>
          </div>
        </header>
      )}

      <ShellPanelsContext.Provider value={panels}>
        <Suspense fallback={<div className="sc-main-wait" />}>
          {children ?? <Outlet />}
        </Suspense>
      </ShellPanelsContext.Provider>

      {cfg.footer ? (
        <footer className="sc-ft">
          <div className="sc-ft-in">
            <div>
              <p>
                <Link to={SC_LINKS.home} className="sc-ft-plain">www.samecor.com</Link>
                {" · "}
                <a href="mailto:info@samecor.com" className="sc-ft-plain">info@samecor.com</a>
              </p>
            </div>
            {/* "Samecor Pro" is left out while the Pro page is hidden (owner decision 8). */}
            <nav aria-label="ลิงก์ท้ายเว็บ" className="sc-ft-nav">
              <Link to={SC_LINKS.getInTouch}>เกี่ยวกับเรา</Link>
              <Link to={SC_LINKS.help}>ช่วยเหลือ</Link>
              <Link to={SC_LINKS.terms}>ข้อกำหนด</Link>
              <Link to={SC_LINKS.privacy}>ความเป็นส่วนตัว</Link>
            </nav>
          </div>
        </footer>
      ) : null}

      {/* Icons only on phones (owner 2026-11-28); the names stay as aria-labels. */}
      <nav className="sc-tb" aria-label="เมนูหลัก">
        <Link to={SC_LINKS.home} data-k="home" aria-label="หน้าแรก" aria-current={tab === "home" ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M4 10.5L12 4l8 6.5V20h-5.5v-5h-5v5H4z" />
          </svg>
        </Link>
        <Link to={SC_LINKS.events} data-k="event" aria-label="Event" aria-current={tab === "event" ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
        </Link>
        {/* "+" opens the New chooser (Showcase / Event) like the home "+" (owner 2026-11-28: members can post events now). */}
        <Link
          to={user ? SC_LINKS.upload : SC_LINKS.login}
          data-k="add"
          aria-label="ลงงาน"
          aria-haspopup={user ? "dialog" : undefined}
          onClick={(e) => {
            if (!user) return;
            e.preventDefault();
            panels.openNew(e.currentTarget);
          }}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        {/* Count comes from the current chat hook; "unread rooms that are not muted" arrives with the Chat step. */}
        <Link to={user ? SC_LINKS.chat : SC_LINKS.login} data-k="chat" aria-label={chatUnread ? `แชท ${chatUnread} ข้อความใหม่` : "แชท"}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" />
          </svg>
          {chatUnread ? <span className="sc-tb-bd" aria-hidden="true">{chatUnread}</span> : null}
        </Link>
        <Link to={user ? SC_LINKS.myProfile : SC_LINKS.login} data-k="me" aria-label="ฉัน" aria-current={tab === "me" ? "page" : undefined}>
          <span className="sc-tb-av" aria-hidden="true" style={bg(avatar)} />
        </Link>
      </nav>

      {user && menu.mounted ? (
        <AccountMenu
          name={name}
          handle={handle}
          avatarUrl={avatar}
          current={current}
          leaving={menu.leaving}
          onClose={closeMenuToButton}
          onLogOut={() => void logOut()}
        />
      ) : null}

      {spotlight.mounted ? <SearchPanel top={spot.top} centred={spot.centred} leaving={spotlight.leaving} onClose={closePanel} /> : null}
      {user && chooser.mounted ? <NewChooser leaving={chooser.leaving} onClose={closePanel} /> : null}
      {calendar.mounted ? <CalendarPanel leaving={calendar.leaving} onClose={closePanel} /> : null}
      {needsWelcome ? (
        <WelcomePanel
          userId={user!.id}
          initialName={onboarding?.display_name && onboarding.display_name !== user?.email?.split("@")[0] ? onboarding.display_name : ""}
          onClose={() => setWelcomeHidden(true)}
        />
      ) : null}
      {user && noti.mounted ? (
        <NotificationPanel
          rows={notiRows}
          loading={inboxLoading}
          top={notiAt.top}
          right={notiAt.right}
          leaving={noti.leaving}
          onOpenRow={openNotiRow}
          onReadAll={() => void markAllRead().catch(() => undefined)}
          onClose={closePanel}
        />
      ) : null}
    </div>
  );
}

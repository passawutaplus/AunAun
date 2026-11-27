import { Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useChatInboxBadgeCount } from "@/hooks/useChat";
import { useNotifications } from "@/core/notifications";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { signOutApp } from "@/lib/signOutApp";
import { usePresence } from "../lib/usePresence";
import { SC_LINKS, shellPageFor, type ShellPage } from "../routes";
import AccountMenu from "./AccountMenu";
import logoUrl from "../assets/logo.svg";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/shell.css";

const FALLBACK: ShellPage = { page: "", tabbar: false, tab: "", footer: true };

const bg = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

/**
 * Frame of the new design: header, footer, floating tab bar on phones, account menu.
 * Pages render their own <main class="sc-main"> through the outlet. None of the old site chrome
 * mounts on these routes (see LegacyChrome in App.tsx). Data comes from the existing hooks only.
 */
export default function RedesignShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cfg = shellPageFor(pathname) ?? FALLBACK;

  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: chatUnread = 0 } = useChatInboxBadgeCount();
  const { unreadCount } = useNotifications(user?.id);

  const menu = usePresence(180);
  const closeMenu = menu.close;
  const acctRef = useRef<HTMLButtonElement>(null);

  // Page background outside .sc-app (overscroll, short pages), while the new frame is on screen.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sc-root");
    return () => root.classList.remove("sc-root");
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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
    <div className="sc-app" data-page={cfg.page || undefined} data-tab={cfg.tabbar ? "on" : "off"}>
      <header className="sc-hd">
        <div className="sc-hd-in">
          <Link to={SC_LINKS.home} aria-label="samecor. หน้าแรก" className="sc-hd-logo">
            <img src={logoUrl} alt="samecor." />
          </Link>
          <nav aria-label="เมนูบัญชี" className="sc-hd-nav">
            <Link to={SC_LINKS.getInTouch} className="sc-hd-text">Get in Touch</Link>
            {/* Search and notifications become panels with the Main page (step 3); until then they open the old pages. */}
            <Link to={SC_LINKS.search} aria-label="ค้นหา" title="ค้นหา" className="sc-ib">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
            </Link>
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
                <Link
                  to={SC_LINKS.notifications}
                  aria-label={unreadCount ? `การแจ้งเตือน ${unreadCount} รายการ` : "การแจ้งเตือน"}
                  className="sc-ib"
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
                    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
                    <path d="M10 20.5a2 2 0 0 0 4 0" />
                  </svg>
                  {unreadCount ? <span aria-hidden="true" className="sc-hd-bd">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                </Link>
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

      <Suspense fallback={<div className="sc-main-wait" />}>
        <Outlet />
      </Suspense>

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

      <nav className="sc-tb" aria-label="เมนูหลัก">
        <Link to={SC_LINKS.home} data-k="home" aria-current={cfg.tab === "home" ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M4 10.5L12 4l8 6.5V20h-5.5v-5h-5v5H4z" />
          </svg>
          หน้าแรก
        </Link>
        <Link to={SC_LINKS.events} data-k="event" aria-current={cfg.tab === "event" ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          Event
        </Link>
        <Link to={user ? SC_LINKS.upload : SC_LINKS.login} data-k="add" aria-label="ลงงาน">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        {/* Count comes from the current chat hook; "unread rooms that are not muted" arrives with the Chat step. */}
        <Link to={user ? SC_LINKS.chat : SC_LINKS.login} data-k="chat" aria-label={chatUnread ? `แชท ${chatUnread} ข้อความใหม่` : "แชท"}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" />
          </svg>
          แชท
          {chatUnread ? <span className="sc-tb-bd" aria-hidden="true">{chatUnread}</span> : null}
        </Link>
        <Link to={user ? SC_LINKS.myProfile : SC_LINKS.login} data-k="me" aria-current={cfg.tab === "me" ? "page" : undefined}>
          <span className="sc-tb-av" aria-hidden="true" style={bg(avatar)} />
          ฉัน
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
    </div>
  );
}

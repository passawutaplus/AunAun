import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { BRAND_LINE_CONTACT_URL } from "@/lib/brandConfig";
import { SC_LINKS } from "../routes";

type Props = {
  name: string;
  handle: string | null;
  avatarUrl: string;
  current: "profile" | "studio" | "settings" | "";
  /** Fading out; the shell unmounts it right after. */
  leaving: boolean;
  onClose: () => void;
  onLogOut: () => void;
};

const Arrow = () => (
  <svg className="am-arrow" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9.5l6 6 6-6" />
  </svg>
);

/**
 * Account menu under the header avatar (mock: pages/AccountMenu.dc.html).
 * "Appearance" is left out until the design has dark colours (owner decision 11).
 */
export default function AccountMenu({ name, handle, avatarUrl, current, leaving, onClose, onLogOut }: Props) {
  const [contactOpen, setContactOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(boxRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : e.key === "ArrowDown" ? (i + 1) % items.length
      : (i - 1 + items.length) % items.length;
    items[next].focus();
  };

  const page = (key: Props["current"]) => (current === key ? ("page" as const) : undefined);

  return (
    <>
      <div className="am-veil" aria-hidden="true" onClick={onClose} />
      <div
        ref={boxRef}
        className="am-box pv-drop"
        role="menu"
        aria-label="เมนูบัญชีของฉัน"
        data-leaving={leaving ? "" : undefined}
        onKeyDown={onKeyDown}
      >
        <Link to={SC_LINKS.myProfile} role="menuitem" className="am-i am-me" aria-current={page("profile")} onClick={onClose}>
          <span aria-hidden="true" className="am-me-av" style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl)})` } : undefined} />
          <span className="am-me-tx">
            <span className="am-me-name">{name}</span>
            <span className="am-me-sub">{handle ? `@${handle} · My Profile` : "My Profile"}</span>
          </span>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link to={SC_LINKS.myStudio} role="menuitem" className="am-i" aria-current={page("studio")} onClick={onClose}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.5l-6.5-8.5L9 4h6l3.5 8z" />
            <circle cx="12" cy="11" r="1.6" />
            <path d="M12 4v5.4" />
          </svg>
          My Studio
        </Link>
        <span aria-hidden="true" className="am-rule" />
        <button type="button" role="menuitem" className="am-i" aria-expanded={contactOpen} onClick={() => setContactOpen((v) => !v)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
            <rect x="3.5" y="13" width="4" height="6" rx="1.5" />
            <rect x="16.5" y="13" width="4" height="6" rx="1.5" />
          </svg>
          <span className="am-grow">Contact</span>
          <Arrow />
        </button>
        {contactOpen ? (
          <div className="am-group">
            <Link to={SC_LINKS.feedback} role="menuitem" className="am-sub" onClick={onClose}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M8.5 14a4 4 0 0 0 7 0" />
                <path d="M9.5 9.5h.01M14.5 9.5h.01" strokeWidth="2" />
              </svg>
              Feedback
            </Link>
            <a href={BRAND_LINE_CONTACT_URL} target="_blank" rel="noopener" role="menuitem" className="am-sub" onClick={onClose}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5c-4.9 0-8.8 3-8.8 6.8 0 2.4 1.6 4.5 4 5.7l-.7 3.3 3.9-2.6c.5.1 1 .1 1.6.1 4.9 0 8.8-3 8.8-6.8S16.9 4.5 12 4.5z" />
              </svg>
              Contact us on LINE
            </a>
            <Link to={SC_LINKS.getInTouch} role="menuitem" className="am-sub" onClick={onClose}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
                <path d="M4 6.5l8 6 8-6" />
              </svg>
              Get in Touch
            </Link>
          </div>
        ) : null}
        <span aria-hidden="true" className="am-rule" />
        <Link to={SC_LINKS.settings} role="menuitem" className="am-i" aria-current={page("settings")} onClick={onClose}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Settings
        </Link>
        <button type="button" role="menuitem" className="am-i am-out" onClick={onLogOut}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h4" />
            <path d="M14 8l4 4-4 4M18 12H9" />
          </svg>
          Log Out
        </button>
      </div>
    </>
  );
}

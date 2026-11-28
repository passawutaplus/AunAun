import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptAllCookies,
  acceptEssentialOnly,
  clearNonEssentialStorage,
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
  hasConsentBannerPending,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/cookieConsent";
import { onEscape } from "./panels";
import "../styles/cookie.css";

const POLICY = "/legal/cookies";

/**
 * Cookie consent on the new design's pages (PDPA). Same stored choice as the old banner (lib/cookieConsent:
 * `anthem-cookie-consent`), so a choice made on either site counts on both. Settings → "ตั้งค่าคุกกี้" reopens
 * the choices through `requestOpenCookiePreferences()` (the old site's event).
 */
export default function CookieBanner() {
  const [pending, setPending] = useState(() => hasConsentBannerPending());
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    const sync = () => setPending(hasConsentBannerPending());
    const openPrefs = () => setPrefsOpen(true);
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPrefs);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPrefs);
    };
  }, []);

  return (
    <>
      {pending && !prefsOpen ? (
        <section className="ck-bar" aria-label="คุกกี้">
          <p className="ck-tx">
            เราใช้คุกกี้ให้เว็บทำงานได้ และนับสถิติการเข้าชมด้วยนะ{" "}
            <Link to={POLICY} className="ck-ln">
              นโยบายคุกกี้
            </Link>
          </p>
          <div className="ck-btns">
            <button type="button" className="ck-b ck-b-ln" onClick={() => setPrefsOpen(true)}>
              ตั้งค่า
            </button>
            <button type="button" className="ck-b" onClick={() => acceptEssentialOnly()}>
              เฉพาะที่จำเป็น
            </button>
            <button type="button" className="ck-b ck-b-pri" onClick={() => acceptAllCookies()}>
              ยอมรับทั้งหมด
            </button>
          </div>
        </section>
      ) : null}
      {prefsOpen ? <CookiePrefs onClose={() => setPrefsOpen(false)} /> : null}
    </>
  );
}

const ROWS: Array<["functional" | "analytics", string, string]> = [
  ["functional", "จำการตั้งค่า", "มุมมองและตัวเลือกที่จำไว้ในเครื่องนี้"],
  ["analytics", "สถิติการเข้าชม", "นับการเข้าชมแบบรวม ไว้ปรับเว็บให้ดีขึ้น"],
];

function CookiePrefs({ onClose }: { onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null));
  const saved = readCookieConsent();
  const [on, setOn] = useState({ functional: saved?.functional ?? true, analytics: saved?.analytics ?? false });

  const close = () => {
    onClose();
    opener.current?.focus?.();
  };

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>("[role='switch']:not(:disabled)")?.focus();
  }, []);

  useEffect(() => onEscape(close));

  const persist = (fn: () => CookieConsentPreferences) => {
    const next = fn();
    if (!next.functional || !next.analytics) clearNonEssentialStorage();
    close();
  };

  return (
    <div className="ck-wrap">
      <div className="pv-veil" aria-hidden="true" onClick={close} />
      <div ref={boxRef} className="ck-box" role="dialog" aria-modal="true" aria-labelledby="sc-ck-h">
        <div className="ck-hd">
          <h2 id="sc-ck-h">ตั้งค่าคุกกี้</h2>
          <button type="button" className="ck-x" aria-label="ปิด" onClick={close}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="ck-rows">
          <div className="ck-row">
            <span className="ck-rl">
              <b>จำเป็น</b>
              <span>เข้าสู่ระบบ ความปลอดภัย และจำคำตอบนี้ · ปิดไม่ได้</span>
            </span>
            <button type="button" className="ck-sw" role="switch" aria-checked="true" aria-label="จำเป็น" disabled>
              <i />
            </button>
          </div>
          {ROWS.map(([k, label, sub]) => (
            <div key={k} className="ck-row">
              <span className="ck-rl">
                <b>{label}</b>
                <span>{sub}</span>
              </span>
              <button
                type="button"
                className="ck-sw"
                role="switch"
                aria-checked={on[k]}
                aria-label={label}
                onClick={() => setOn((v) => ({ ...v, [k]: !v[k] }))}
              >
                <i />
              </button>
            </div>
          ))}
        </div>
        <p className="ck-more">
          <Link to={POLICY} className="ck-ln" onClick={() => onClose()}>
            อ่านนโยบายคุกกี้
          </Link>
        </p>
        <div className="ck-btns">
          <button type="button" className="ck-b" onClick={() => persist(acceptAllCookies)}>
            ยอมรับทั้งหมด
          </button>
          <button type="button" className="ck-b ck-b-pri" onClick={() => persist(() => writeCookieConsent(on))}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

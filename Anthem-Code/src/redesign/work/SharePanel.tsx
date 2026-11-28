import { useEffect, useState, type ReactNode } from "react";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { sharePageHost } from "@/lib/shareTargets";
import { isNativeApp } from "@/lib/appShell";
import { SC_SHARE_MAIN, SC_SHARE_TARGETS } from "./shareTargets";
import ShareChat from "./ShareChat";
import logoUrl from "../assets/logo.svg";

type Props = {
  url: string;
  title: string;
  /** The picture shown in the preview (the shared picture, or the work's cover). */
  image: string;
  imageRatio: number | null;
  onClose: () => void;
  say: (t: string) => void;
  /** Signed in + a work: the "ส่งในแชท" row. */
  chat?: { userId: string; work: { id: string; title: string } } | null;
};

/**
 * Share a work (owner 2026-11-28: the old site's share sheet, in the new look): a preview of what is shared,
 * the link with Copy, then the places to send it (./shareTargets).
 */
const MAIN = SC_SHARE_TARGETS.filter((t) => SC_SHARE_MAIN.includes(t.key));
const ORDERED = [...MAIN, ...SC_SHARE_TARGETS.filter((t) => !SC_SHARE_MAIN.includes(t.key))];

const dots = (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </svg>
);

export default function SharePanel({ url, title, image, imageRatio, onClose, say, chat }: Props) {
  const [canNative] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  // The store apps: the phone's own share sheet already lists every installed app.
  const [inApp] = useState(() => isNativeApp());
  const [more, setMore] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const copy = async (note = "คัดลอกลิงก์แล้ว") => {
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // clipboard blocked: the link is still in the field to copy by hand
    }
    say(note);
  };

  return (
    <div className="sh-veil">
      <div aria-hidden="true" className="sh-hit" onClick={onClose} />
      <div className="sh-box" role="dialog" aria-modal="true" aria-labelledby="sh-h">
        <button type="button" className="sh-x" aria-label="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 id="sh-h">แชร์</h2>

        <div className="sh-card">
          <span className="sh-pic">
            {image ? <img src={proxiedImageUrl(image, 960)} alt="" style={imageRatio && imageRatio > 1.4 ? undefined : { objectFit: "contain" }} /> : null}
            <img src={logoUrl} alt="" className="sh-logo" />
          </span>
          <span className="sh-meta">
            <span className="sh-title">{title || "SAMECOR"}</span>
            <span className="sh-host">{sharePageHost(url)}</span>
          </span>
        </div>

        <div className="sh-link">
          <label className="sh-sr" htmlFor="sh-url">
            ลิงก์
          </label>
          <input id="sh-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={() => void copy()}>
            คัดลอก
          </button>
        </div>

        {chat ? <ShareChat userId={chat.userId} work={chat.work} say={say} /> : null}

        <section className="sh-sec" aria-labelledby="sh-to-h">
          <h3 id="sh-to-h">แชร์ไปยัง</h3>
          <div className="sh-targets">
            {inApp ? null : (more ? ORDERED : MAIN).map((t) => (
              <a
                key={t.key}
                href={t.href(url, title, image)}
                target="_blank"
                rel="noopener noreferrer"
                className="sh-t"
                onClick={() => {
                  if (t.copyHint) void copy(t.copyHint);
                }}
              >
                <span className="sh-ic">{t.icon}</span>
                <span className="sh-tl">{t.label}</span>
              </a>
            ))}
            {inApp || (more && canNative) ? (
              <Target
                label={inApp ? "แชร์ไปแอป" : "แอปอื่น"}
                icon={dots}
                onClick={() => {
                  navigator.share?.({ title, url }).catch(() => undefined);
                }}
              />
            ) : null}
            {inApp ? null : (
              <Target
                label={more ? "ย่อ" : "เพิ่มเติม"}
                expanded={more}
                icon={
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={more ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
                  </svg>
                }
                onClick={() => setMore((m) => !m)}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Target({ label, icon, onClick, expanded }: { label: string; icon: ReactNode; onClick: () => void; expanded?: boolean }) {
  return (
    <button type="button" className="sh-t" aria-expanded={expanded} onClick={onClick}>
      <span className="sh-ic">{icon}</span>
      <span className="sh-tl">{label}</span>
    </button>
  );
}

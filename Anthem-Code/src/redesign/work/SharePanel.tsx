import { useEffect, useState } from "react";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { sharePageHost } from "@/lib/shareTargets";
import { SC_SHARE_TARGETS } from "./shareTargets";
import logoUrl from "../assets/logo.svg";

type Props = {
  url: string;
  title: string;
  /** The picture shown in the preview (the shared picture, or the work's cover). */
  image: string;
  imageRatio: number | null;
  onClose: () => void;
  say: (t: string) => void;
};

/**
 * Share a work (owner 2026-11-28: the old site's share sheet, in the new look): a preview of what is shared,
 * the link with Copy, then the places to send it (./shareTargets).
 */
export default function SharePanel({ url, title, image, imageRatio, onClose, say }: Props) {
  const [canNative] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

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

        <div className="sh-targets">
          {SC_SHARE_TARGETS.map((t) => (
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
              <span>{t.label}</span>
            </a>
          ))}
          {canNative ? (
            <button
              type="button"
              className="sh-t"
              onClick={() => {
                navigator.share({ title, url }).catch(() => undefined);
              }}
            >
              <span className="sh-ic">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="6" cy="12" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="18" cy="12" r="1" />
                </svg>
              </span>
              <span>แอปอื่น</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

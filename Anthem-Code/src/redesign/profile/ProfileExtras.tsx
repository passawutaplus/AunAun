import type { ReactNode } from "react";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import type { Socials } from "./socials";
import "../styles/profile-extras.css";

/** The profile cover (32:9 crop from My Studio › Profile), above the profile on Profile and My Profile. */
export function ProfileCover({ url }: { url: string | null | undefined }) {
  const src = url?.trim();
  if (!src || !/^https?:\/\//i.test(src)) return null;
  const set = proxiedImageSrcSet(src, [800, 1600, 1920]);
  return (
    <div className="pf-cover">
      <img alt="" src={proxiedImageUrl(src, 1600)} srcSet={set || undefined} sizes="(max-width: 600px) 100vw, 1360px" decoding="async" />
    </div>
  );
}

const FB = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5l.5-3.5h-3V9a.5.5 0 0 1 .5-.5z" />
  </svg>
);
const LINE = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinejoin="round">
    <path d="M12 4C7 4 3 7.2 3 11.1c0 3.5 3.1 6.4 7.3 7l-.4 2.4c-.1.5.4.8.8.6 2.9-1.6 6.6-4.2 8.2-6.3 1-1.1 1.6-2.4 1.6-3.7C21 7.2 17 4 12 4z" />
  </svg>
);
const LINK = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round">
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </svg>
);

/** Facebook, LINE and other links as round icons, next to Instagram / e-mail / website in the header. */
export function SocialIcons({ s }: { s: Socials }) {
  return (
    <>
      {s.facebook ? (
        <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={`Facebook ${s.facebookLabel}`} title={`Facebook ${s.facebookLabel}`}>
          {FB}
        </a>
      ) : null}
      {s.line ? (
        <a href={s.lineHref} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={`LINE ${s.line}`} title={`LINE ${s.line}`}>
          {LINE}
        </a>
      ) : null}
      {s.links.map((l) => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={l.title} title={l.title}>
          {LINK}
        </a>
      ))}
    </>
  );
}

/** Rows for the phone CONTACT box in About (same look as the Instagram / website / e-mail rows). */
export function SocialRows({ s }: { s: Socials }) {
  const row = (key: string, href: string, label: string, value: string, icon: ReactNode) => (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer">
      <span>{icon}</span>
      <span>
        <small>{label}</small>
        {value}
      </span>
      <i aria-hidden="true">↗</i>
    </a>
  );
  return (
    <>
      {s.facebook ? row("fb", s.facebook, "FACEBOOK", s.facebookLabel, FB) : null}
      {s.line ? row("line", s.lineHref, "LINE", s.line, LINE) : null}
      {s.links.map((l) => row(l.key, l.href, l.title.toUpperCase(), l.href.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, ""), LINK))}
    </>
  );
}

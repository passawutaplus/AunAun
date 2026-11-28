import type { ReactNode } from "react";
import { isLikelyMobileShareClient, messengerHref } from "@/lib/shareTargets";

/**
 * Places to share a work from the new design's share panel (owner 2026-11-28: the old list plus Lemon8,
 * IG Story, Threads, Pinterest, Telegram, LinkedIn). Apps without a share link open with the link copied.
 * Facebook / Messenger / Instagram / LINE / WhatsApp / WeChat use the old site's icons (/public/brand-icons);
 * X / Threads / Pinterest / LinkedIn are their real marks drawn here; Lemon8 is the owner's logo file
 * (2026-11-28, /public/brand-icons/lemon8.png, 156 px).
 */
export type ScShareTarget = {
  key: string;
  label: string;
  href: (url: string, title: string, image: string) => string;
  /** The app has no share link: copy the link first and say where to paste it. */
  copyHint?: string;
  icon: ReactNode;
};

const enc = encodeURIComponent;
const file = (name: string, ext = "svg") => <img src={`/brand-icons/${name}.${ext}`} alt="" />;

/** A brand-coloured circle with a white mark inside (24-unit box). */
const disc = (bg: string, mark: ReactNode, fg = "#FFFFFF") => (
  <svg aria-hidden="true" viewBox="0 0 52 52" width="52" height="52">
    <circle cx="26" cy="26" r="26" fill={bg} />
    <g transform="translate(14 14)" fill={fg}>
      {mark}
    </g>
  </svg>
);

const word = (text: string, size: number, weight = 700, family = "Arial, Helvetica, sans-serif") => (
  <text x="12" y="12" dominantBaseline="central" textAnchor="middle" fontSize={size} fontWeight={weight} fontFamily={family}>
    {text}
  </text>
);

const X_MARK = (
  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" transform="translate(2 2) scale(.84)" />
);

const TELEGRAM_MARK = (
  <path d="M2.2 11.4l17.6-6.8c.8-.3 1.6.2 1.3 1.5l-3 14c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L6.6 14.3l-4.5-1.4c-1-.3-1-1 .1-1.5z" />
);

/** Real brand marks (shapes as published by each brand; 24-unit paths), owner 2026-11-28. */
const THREADS_PATH =
  "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z";
const PINTEREST_PATH =
  "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z";
const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

/** A whole-logo path (it carries its own shape) at `size` px, centred in the 52px button. */
const mark = (d: string, color: string, size: number) => {
  const k = size / 24;
  const o = (52 - size) / 2;
  return (
    <svg aria-hidden="true" viewBox="0 0 52 52" width="52" height="52">
      <path d={d} fill={color} transform={`translate(${o} ${o}) scale(${k})`} />
    </svg>
  );
};

const IG_STORY = (
  <svg aria-hidden="true" viewBox="0 0 52 52" width="52" height="52">
    <defs>
      <linearGradient id="sc-igs" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#FEDA75" />
        <stop offset=".35" stopColor="#FA7E1E" />
        <stop offset=".6" stopColor="#D62976" />
        <stop offset=".8" stopColor="#962FBF" />
        <stop offset="1" stopColor="#4F5BD5" />
      </linearGradient>
    </defs>
    <circle cx="26" cy="26" r="26" fill="#FFFFFF" />
    <circle cx="26" cy="26" r="22.5" fill="none" stroke="url(#sc-igs)" strokeWidth="3" strokeDasharray="10 3.5" />
    <rect x="17" y="17" width="18" height="18" rx="5.5" fill="none" stroke="url(#sc-igs)" strokeWidth="2.2" />
    <circle cx="26" cy="26" r="4.2" fill="none" stroke="url(#sc-igs)" strokeWidth="2.2" />
    <circle cx="31.3" cy="20.7" r="1.3" fill="url(#sc-igs)" />
  </svg>
);

export const SC_SHARE_TARGETS: ScShareTarget[] = [
  { key: "facebook", label: "Facebook", icon: file("facebook"), href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  { key: "messenger", label: "Messenger", icon: file("messenger"), href: (url) => messengerHref(url), copyHint: "คัดลอกแล้ว — วางลิงก์ในแชท Messenger ได้เลย" },
  { key: "instagram", label: "Instagram", icon: file("instagram"), href: () => "https://www.instagram.com/", copyHint: "คัดลอกแล้ว — วางลิงก์ในแชทหรือโพสต์ได้เลย" },
  {
    key: "ig-story",
    label: "IG Story",
    icon: IG_STORY,
    // Phones open the story camera; add the copied link with the link sticker.
    href: () => (isLikelyMobileShareClient() ? "instagram://story-camera" : "https://www.instagram.com/"),
    copyHint: "คัดลอกแล้ว — ในสตอรี่ใช้สติกเกอร์ลิงก์แล้ววางได้เลย",
  },
  { key: "threads", label: "Threads", icon: disc("#000000", <path d={THREADS_PATH} transform="translate(1 1) scale(.92)" />), href: (url, title) => `https://www.threads.net/intent/post?text=${enc(`${title} ${url}`)}` },
  { key: "line", label: "LINE", icon: file("line"), href: (url) => `https://social-plugins.line.me/lineit/share?url=${enc(url)}` },
  {
    key: "lemon8",
    label: "Lemon8",
    icon: file("lemon8", "png"),
    href: () => "https://www.lemon8-app.com/",
    copyHint: "คัดลอกแล้ว — วางลิงก์ในโพสต์ Lemon8 ได้เลย",
  },
  { key: "x", label: "X", icon: disc("#000000", X_MARK), href: (url, title) => `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: mark(PINTEREST_PATH, "#E60023", 52),
    href: (url, title, image) => `https://www.pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(title)}${image ? `&media=${enc(image)}` : ""}`,
  },
  { key: "whatsapp", label: "WhatsApp", icon: file("whatsapp"), href: (url, title) => `https://api.whatsapp.com/send?text=${enc(`${title} ${url}`)}` },
  { key: "telegram", label: "Telegram", icon: disc("#26A5E4", TELEGRAM_MARK), href: (url, title) => `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}` },
  { key: "wechat", label: "WeChat", icon: file("wechat"), href: () => "https://web.wechat.com/", copyHint: "คัดลอกแล้ว — วางลิงก์ใน WeChat ได้เลย" },
  { key: "linkedin", label: "LinkedIn", icon: mark(LINKEDIN_PATH, "#0A66C2", 30), href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  {
    key: "email",
    label: "อีเมล",
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    ),
    href: (url, title) => `mailto:?subject=${enc(title)}&body=${enc(url)}`,
  },
];

/** The one row shown before "เพิ่มเติม" (owner 2026-11-28: the main socials first, the rest folded away). */
export const SC_SHARE_MAIN = ["facebook", "instagram", "line", "x"];

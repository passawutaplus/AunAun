/** Destinations in the share sheet — only list channels we can actually open or copy into. */

export type SharePlatform =
  | "facebook"
  | "messenger"
  | "instagram"
  | "line"
  | "whatsapp"
  | "wechat"
  | "x"
  | "email"
  | "copy"
  | "web_share";

export type ShareTarget = {
  key: Exclude<SharePlatform, "copy" | "web_share">;
  label: string;
  /** Brand SVG in /public/brand-icons, or lucide for email. */
  icon: "facebook" | "messenger" | "instagram" | "line" | "whatsapp" | "wechat" | "x" | "mail";
  wellClass: string;
  imgClass: string;
  /** Opens in a new tab. Direct share composer when the platform has one. */
  href: (url: string, title: string) => string;
  /** If set, copy the link first so the user can paste on the opened page. */
  copyHint?: string;
};

const enc = (value: string) => encodeURIComponent(value);

export function sharePageHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isLikelyMobileShareClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Messenger app share on phones; desktop opens Messenger web so the user can paste. */
export function messengerHref(url: string): string {
  if (isLikelyMobileShareClient()) {
    return `fb-messenger://share/?link=${enc(url)}`;
  }
  return "https://www.messenger.com/";
}

export const SHARE_TARGETS: ShareTarget[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "facebook",
    wellClass: "",
    imgClass: "h-12 w-12",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  {
    key: "messenger",
    label: "Messenger",
    icon: "messenger",
    wellClass: "",
    imgClass: "h-12 w-12",
    href: (url) => messengerHref(url),
    copyHint: "คัดลอกแล้ว — วางลิงก์ในแชท Messenger ได้เลย",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "instagram",
    wellClass: "",
    imgClass: "h-12 w-12",
    href: () => "https://www.instagram.com/",
    copyHint: "คัดลอกแล้ว — วางลิงก์ในแชทหรือสตอรี่ได้เลย",
  },
  {
    key: "line",
    label: "LINE",
    icon: "line",
    wellClass: "bg-white",
    imgClass: "h-9 w-9",
    href: (url) => `https://social-plugins.line.me/lineit/share?url=${enc(url)}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "whatsapp",
    wellClass: "",
    imgClass: "h-12 w-12",
    href: (url, title) => `https://api.whatsapp.com/send?text=${enc(`${title} ${url}`)}`,
  },
  {
    key: "wechat",
    label: "WeChat",
    icon: "wechat",
    wellClass: "",
    imgClass: "h-12 w-12",
    href: () => "https://web.wechat.com/",
    copyHint: "คัดลอกแล้ว — วางลิงก์ใน WeChat ได้เลย",
  },
  {
    key: "x",
    label: "X",
    icon: "x",
    wellClass: "bg-black dark:bg-white",
    imgClass: "h-5 w-5 invert dark:invert-0",
    href: (url, title) => `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
  },
  {
    key: "email",
    label: "อีเมล",
    icon: "mail",
    wellClass: "bg-background text-foreground ring-border/70",
    imgClass: "",
    href: (url, title) => `mailto:?subject=${enc(title)}&body=${enc(url)}`,
  },
];

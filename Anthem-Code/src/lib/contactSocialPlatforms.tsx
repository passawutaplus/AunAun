import type { ComponentType, SVGProps } from "react";
import { Instagram, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import lemon8WordmarkUrl from "@/assets/brands/lemon8-wordmark-transparent.png";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function XMark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden={true} {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.99 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TikTokMark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden={true} {...props}>
      <path d="M16.6 5.82A4.96 4.96 0 0 1 19.2 5.1V8.3a7.9 7.9 0 0 1-2.6.44v6.2a5.96 5.96 0 1 1-5.96-5.96c.2 0 .4.01.6.04v3.13a2.86 2.86 0 1 0 2.3 2.8V2.5h3.06c.2 1.2.8 2.3 1.66 3.32z" />
    </svg>
  );
}

function FacebookMark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden={true} {...props}>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.4-3.68 3.56-3.68 1.03 0 2.11.18 2.11.18v2.33h-1.19c-1.17 0-1.54.73-1.54 1.48v1.78h2.62l-.42 2.91h-2.2V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}

/** Official Lemon8 wordmark — monochrome via mask so it matches other social marks. */
function Lemon8Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden={true}
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${lemon8WordmarkUrl})`,
        maskImage: `url(${lemon8WordmarkUrl})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export type ContactSocialPlatformId =
  | "facebook"
  | "instagram"
  | "x"
  | "tiktok"
  | "lemon8";

export type ContactSocialPlatform = {
  id: ContactSocialPlatformId;
  label: string;
  placeholder: string;
  Icon: ComponentType<{ className?: string }>;
  matchTitles: string[];
};

/** Contact channels only — not portfolio sites (Behance, etc.). */
export const CONTACT_SOCIAL_PLATFORMS: ContactSocialPlatform[] = [
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/…",
    Icon: FacebookMark,
    matchTitles: ["facebook", "fb"],
  },
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/… หรือ @username",
    Icon: Instagram,
    matchTitles: ["instagram", "ig", "insta"],
  },
  {
    id: "x",
    label: "X",
    placeholder: "https://x.com/…",
    Icon: XMark,
    matchTitles: ["x", "twitter", "x.com"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@…",
    Icon: TikTokMark,
    matchTitles: ["tiktok", "tik tok"],
  },
  {
    id: "lemon8",
    label: "Lemon8",
    placeholder: "https://lemon8-app.com/@…",
    Icon: Lemon8Mark,
    matchTitles: ["lemon8", "lemon 8"],
  },
];

export function resolveContactSocialPlatform(
  title: string,
): ContactSocialPlatform | null {
  const key = title.trim().toLowerCase();
  return (
    CONTACT_SOCIAL_PLATFORMS.find(
      (p) => p.id === key || p.matchTitles.includes(key) || p.label.toLowerCase() === key,
    ) ?? null
  );
}

export function ContactSocialIcon({
  title,
  className = "w-5 h-5",
}: {
  title: string;
  className?: string;
}) {
  const platform = resolveContactSocialPlatform(title);
  if (!platform) return <Link2 className={className} aria-hidden={true} />;
  const Icon = platform.Icon;
  return <Icon className={className} />;
}

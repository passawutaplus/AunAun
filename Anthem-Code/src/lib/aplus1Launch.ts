import type { FeedMode } from "@/components/feed/FeedModeToggle";

/** Launch slice: Projects + Designers + hire/chat only — hide marketplace extras. */
export function isAplus1LaunchMinimal(): boolean {
  return import.meta.env.VITE_APLUS1_LAUNCH_MINIMAL === "true";
}

export const LAUNCH_FEED_MODES = ["projects", "designers"] as const;
export type LaunchFeedMode = (typeof LAUNCH_FEED_MODES)[number];

export function isLaunchFeedMode(mode: FeedMode): mode is LaunchFeedMode {
  if (!isAplus1LaunchMinimal()) return true;
  return (LAUNCH_FEED_MODES as readonly string[]).includes(mode);
}

export function coerceLaunchFeedMode(mode: FeedMode): LaunchFeedMode {
  if (isLaunchFeedMode(mode)) return mode;
  return "projects";
}

/** Paths redirected to home when launch minimal is on (prefix match). */
export const LAUNCH_HIDDEN_PATH_PREFIXES = [
  "/jobs",
  "/community",
  "/advertise",
  "/ads",
  "/upgrade",
  "/earnings",
  "/referrals",
  "/drill",
  "/studio",
  "/s",
  "/contracts",
  "/research",
  "/inspire",
  "/similar",
  "/verify",
  "/collections",
  "/me/reports",
  "/me/feedback",
  "/reports",
  "/feedback",
  "/hire-requests",
  "/collab-requests",
] as const;

const LAUNCH_ALLOWED_PREFIXES = [
  "/admin",
  "/auth",
  "/legal",
  "/project",
  "/u/",
  "/portfolio",
  "/chat",
  "/settings",
  "/notifications",
  "/explore",
  "/error",
  "/reset-password",
] as const;

export function isLaunchHiddenPath(pathname: string): boolean {
  if (!isAplus1LaunchMinimal()) return false;
  if (pathname === "/") return false;
  for (const allowed of LAUNCH_ALLOWED_PREFIXES) {
    if (pathname === allowed || pathname.startsWith(`${allowed}/`) || pathname.startsWith(allowed)) {
      return false;
    }
  }
  return LAUNCH_HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const LAUNCH_COMING_SOON_TH =
  "ฟีเจอร์นี้จะเปิดให้ใช้เร็ว ๆ นี้ — ตอนนี้โฟกัสค้นหาจากผลงานและคุยโอกาส";

/** Aplus1 ↔ So1o ecosystem — disabled at launch until env enables it. */
export function isSoloEcosystemEnabled(): boolean {
  return (
    import.meta.env.VITE_SOLO_ECOSYSTEM_ENABLED === "true" ||
    import.meta.env.VITE_APLUS1_UPGRADE_ENABLED === "true"
  );
}

/** @deprecated Use isSoloEcosystemEnabled — kept for existing call sites. */
export const isAplus1UpgradeEnabled = isSoloEcosystemEnabled;

export const UPGRADE_PATH = "/upgrade";

export const UPGRADE_COMING_SOON_TH =
  "แพ็ก Pro บน Aplus1 กำลังจะเปิดให้สมัครเร็ว ๆ นี้ — ใช้งานฟรีและ Pixel ได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_TH =
  "การเชื่อมต่อ So1o Freelancer กำลังจะเปิดเร็ว ๆ นี้ — ใช้ Aplus1 โพสต์ผลงาน แชท และรับงานได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_SHORT = "So1o — เร็ว ๆ นี้";

export const APLUS1_PAYMENTS_DISABLED_TH =
  "การชำระเงินผ่าน Stripe กำลังจะเปิดเร็ว ๆ นี้ — รับของขวัญและ daily px ใช้ได้ตามปกติ";

/** Stripe checkout / Connect / cashout / boost / ads — can be enabled separately from Solo UI links. */
export function isAplus1PaymentsEnabled(): boolean {
  if (isAplus1LaunchMinimal()) {
    return false;
  }
  if (import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "false") {
    return false;
  }
  if (
    import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "true" ||
    isSoloEcosystemEnabled()
  ) {
    return true;
  }
  // Production builds (aplus1.app + aplus1-demo): payments on unless opted out
  return import.meta.env.PROD;
}

export function isLaunchCollabEnabled(): boolean {
  return !isAplus1LaunchMinimal();
}

export class SoloEcosystemDisabledError extends Error {
  constructor(message = SOLO_ECOSYSTEM_COMING_SOON_TH) {
    super(message);
    this.name = "SoloEcosystemDisabledError";
  }
}

export function assertSoloEcosystemEnabled(): void {
  if (!isSoloEcosystemEnabled()) {
    throw new SoloEcosystemDisabledError();
  }
}

export function assertAplus1PaymentsEnabled(): void {
  if (!isAplus1PaymentsEnabled()) {
    throw new SoloEcosystemDisabledError(APLUS1_PAYMENTS_DISABLED_TH);
  }
}

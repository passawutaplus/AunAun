import type { FeedMode } from "@/components/feed/FeedModeToggle";

/**
 * Launch scope: Projects + Designers + project-qualified hire/chat + save/collections.
 * Fail-closed: minimal unless VITE_APLUS1_FULL_PRODUCT=true.
 */
export function isAplus1FullProduct(): boolean {
  return import.meta.env.VITE_APLUS1_FULL_PRODUCT === "true";
}

/** Fail-closed: minimal unless VITE_APLUS1_FULL_PRODUCT=true. */
export function isAplus1LaunchMinimal(): boolean {
  return !isAplus1FullProduct();
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

/**
 * Explicit allowlist for launch-minimal routes (prefix/regex).
 * New routes are blocked until added here — fail-closed by design.
 */
export const LAUNCH_ALLOWED_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/auth(\/|$)/,
  /^\/reset-password$/,
  /^\/portfolio(\/|$)/,
  /^\/project\/[^/]+$/,
  /^\/u\/[^/]+(\/followers)?$/,
  /^\/explore\/[^/]+\/[^/]+$/,
  /^\/chat(\/|$)/,
  /^\/settings$/,
  /^\/notifications$/,
  /^\/collections(\/|$)/,
  /^\/legal\//,
  /^\/admin(\/|$)/,
  /^\/error(\/|$)/,
  /^\/me\/(reports|feedback)$/,
  /^\/@[^/]+$/,
];

/** @deprecated Use LAUNCH_ALLOWED_ROUTE_PATTERNS — denylist kept for docs/tests only. */
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
  "/me/reports",
  "/me/feedback",
  "/reports",
  "/feedback",
  "/hire-requests",
  "/collab-requests",
] as const;

export function isLaunchAllowedPath(pathname: string): boolean {
  if (!isAplus1LaunchMinimal()) return true;
  return LAUNCH_ALLOWED_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

export function isLaunchHiddenPath(pathname: string): boolean {
  if (!isAplus1LaunchMinimal()) return false;
  return !isLaunchAllowedPath(pathname);
}

export const LAUNCH_COMING_SOON_TH =
  "ฟีเจอร์นี้จะเปิดให้ใช้เร็ว ๆ นี้ — ตอนนี้โฟกัสค้นหาจากผลงานและคุยโอกาส";

/** Paid tiers (Pro / Pro+ / In-House) — disabled at launch; everyone uses free limits. */
export function isAplus1SubscriptionsEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_SUBSCRIPTIONS_ENABLED === "true";
}

/** Aplus1 ↔ So1o ecosystem — disabled at launch unless env enables it. */
export function isSoloEcosystemEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
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

/** Stripe checkout / Connect / cashout / boost / ads — explicit opt-in only. */
export function isAplus1PaymentsEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "true";
}

export function isLaunchCollabEnabled(): boolean {
  return true;
}

/** Creator support / gifting CTA — disabled at launch until explicitly enabled. */
export function isLaunchCreatorSupportEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_SUPPORT_ENABLED === "true";
}

/** Design Drill — disabled at launch until explicitly enabled. */
export function isLaunchDesignDrillEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_DESIGN_DRILL_ENABLED === "true";
}

/** Boost (post/project promotion) — disabled at launch until explicitly enabled. */
export function isLaunchBoostEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_BOOST_ENABLED === "true";
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

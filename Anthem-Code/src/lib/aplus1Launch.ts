import type { FeedMode } from "@/components/feed/FeedModeToggle";

/**
 * Launch scope: Projects + Designers + packages + hire/collab/chat + save/collections.
 * Job board (They are HIRING) is deferred — opt-in with VITE_APLUS1_HIRING_BOARD_ENABLED.
 * Fail-closed: minimal unless VITE_APLUS1_FULL_PRODUCT=true.
 */
export function isAplus1FullProduct(): boolean {
  return import.meta.env.VITE_APLUS1_FULL_PRODUCT === "true";
}

/** Fail-closed: minimal unless VITE_APLUS1_FULL_PRODUCT=true. */
export function isAplus1LaunchMinimal(): boolean {
  return !isAplus1FullProduct();
}

export const LAUNCH_FEED_MODES = ["projects", "designers", "packages", "objects"] as const;
export type LaunchFeedMode = (typeof LAUNCH_FEED_MODES)[number];

export function isLaunchFeedMode(mode: FeedMode): mode is LaunchFeedMode {
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
  /^\/learn(\/|$)/,
  /^\/help(\/|$)/,
  /^\/dev\/review-form$/,
  /^\/dev\/hire-cancel$/,
  /^\/hire(\/|$)/,
  /^\/verify$/,
  /^\/auth(\/|$)/,
  /^\/reset-password$/,
  /^\/portfolio(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/hire-requests$/,
  /^\/collab-requests$/,
  /^\/project\/[^/]+$/,
  /^\/service\/[^/]+$/,
  /^\/object\/[^/]+$/,
  /^\/u\/[^/]+(\/followers)?$/,
  /^\/explore\/[^/]+\/[^/]+$/,
  /^\/chat(\/|$)/,
  /^\/settings$/,
  /^\/notifications$/,
  /^\/earnings(\/|$)/,
  /^\/collections(\/|$)/,
  /^\/series(\/|$)/,
  /^\/similar\/[^/]+$/,
  /^\/inspire(\/|$)/,
  /^\/forum(\/|$)/,
  /^\/legal(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/error(\/|$)/,
  /^\/me\/(reports|feedback)$/,
  /^\/@[^/]+$/,
];

/** Public Area + Studio discovery — retired even when full product is on. */
export const RETIRED_PUBLIC_PATH_PREFIXES = ["/community", "/studio", "/s"] as const;

export function isRetiredPublicPath(pathname: string): boolean {
  return RETIRED_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Job board + org register — kept in code, off until explicitly enabled. */
export const HIRING_BOARD_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/jobs(\/|$)/,
  /^\/hiring(\/|$)/,
  /^\/org(\/|$)/,
];

export function isHiringBoardPath(pathname: string): boolean {
  return HIRING_BOARD_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * They are HIRING / org posting — fail-closed.
 * Re-enable with VITE_APLUS1_HIRING_BOARD_ENABLED=true after the board review is done.
 */
export function isAplus1HiringBoardEnabled(): boolean {
  return import.meta.env.VITE_APLUS1_HIRING_BOARD_ENABLED === "true";
}

/** @deprecated Use LAUNCH_ALLOWED_ROUTE_PATTERNS — denylist kept for docs/tests only. */
export const LAUNCH_HIDDEN_PATH_PREFIXES = [
  "/jobs",
  "/hiring",
  "/org",
  "/community",
  "/advertise",
  "/ads",
  "/upgrade",
  "/referrals",
  "/drill",
  "/studio",
  "/s",
  "/contracts",
  "/research",
  "/verify",
  "/me/reports",
  "/me/feedback",
  "/reports",
  "/feedback",
  "/hire-requests",
  "/collab-requests",
] as const;

export function isLaunchAllowedPath(pathname: string): boolean {
  if (isHiringBoardPath(pathname)) return isAplus1HiringBoardEnabled();
  if (!isAplus1LaunchMinimal()) return true;
  return LAUNCH_ALLOWED_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Coming-soon only for known deferred prefixes that are not on the allowlist.
 * Unknown URLs must fall through to the real 404 page — not “ยังไม่เปิดในเวอร์ชันนี้”.
 */
export function isLaunchHiddenPath(pathname: string): boolean {
  if (isRetiredPublicPath(pathname)) return true;
  if (isHiringBoardPath(pathname)) return !isAplus1HiringBoardEnabled();
  if (!isAplus1LaunchMinimal()) return false;
  if (isLaunchAllowedPath(pathname)) return false;
  return LAUNCH_HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const LAUNCH_COMING_SOON_TH =
  "ฟีเจอร์นี้จะเปิดให้ใช้เร็ว ๆ นี้ — ตอนนี้โฟกัสค้นหาจากผลงานและคุยโอกาส";

/** Paid tiers (Pro / Pro+ / In-House) — disabled at launch; everyone uses free limits. */
export function isAplus1SubscriptionsEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_SUBSCRIPTIONS_ENABLED === "true";
}

/** SAMECOR ↔ So1o ecosystem — disabled at launch unless env enables it. */
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
  "แพ็ก Pro บน SAMECOR กำลังจะเปิดให้สมัครเร็ว ๆ นี้ — ใช้งานฟรีได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_TH =
  "การเชื่อมต่อ So1o Freelancer กำลังจะเปิดเร็ว ๆ นี้ — ใช้ SAMECOR โพสต์ผลงาน แชท และรับงานได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_SHORT = "So1o — เร็ว ๆ นี้";

export const APLUS1_PAYMENTS_DISABLED_TH =
  "กำลังเปิดรับชำระผ่าน SAMECOR — ใช้งานโพสต์ผลงาน แชท และรับงานได้ตามปกติ";

/** Legacy Solo/Stripe fiat paths are cut — use Payso when enabled. */
export const APLUS1_SOLO_PAYMENTS_CUTOVER_TH =
  "SAMECOR ไม่รับชำระผ่าน So1o อีกต่อไป — ระบบชำระเงินใหม่กำลังเปิดเร็ว ๆ นี้";

/** Payso hire/checkout UI — explicit opt-in (still blocked live without marketplace approval). */
export function isAplus1PaymentsEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "true";
}

/** THB/USD display switcher for offers / portfolio / checkout labels (not PX). */
export function isDisplayCurrencyEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_DISPLAY_CURRENCY_ENABLED === "true";
}

/**
 * In-chat quotation / offer docs.
 * Enabled by default for hire-chat testing, including launch minimal.
 * Can still be explicitly disabled with VITE_APLUS1_CHAT_OFFERS_ENABLED=false.
 */
export function isAplus1ChatOffersEnabled(): boolean {
  const explicit = import.meta.env.VITE_APLUS1_CHAT_OFFERS_ENABLED as string | undefined;
  return explicit !== "false";
}

export const APLUS1_CHAT_OFFERS_COMING_SOON_TH =
  "ใบเสนอราคาในแชทจะเปิดหลังรอบใช้งานแรก — ตอนนี้คุยรายละเอียดงานในแชทได้ตามปกติ";

export function isLaunchCollabEnabled(): boolean {
  return true;
}

/**
 * Pixel wallet, cashout, welcome PX, referral PX rewards.
 * Off until explicitly re-enabled — hire THB stays on /earnings.
 * Re-enable with VITE_APLUS1_PX_ENABLED=true and VITE_APLUS1_FULL_PRODUCT=true.
 */
export function isAplus1PxEnabled(): boolean {
  if (isAplus1LaunchMinimal()) return false;
  return import.meta.env.VITE_APLUS1_PX_ENABLED === "true";
}

/** Creator support / gifting CTA — disabled until gift economy is re-enabled. */
export function isLaunchCreatorSupportEnabled(): boolean {
  return isAplus1GiftEconomyEnabled();
}

/**
 * PX gifts, daily free claim, gift catalog/missions, earn-readiness UI.
 * Requires Pixel to be on. Re-enable with VITE_APLUS1_GIFT_ECONOMY_ENABLED=true
 * (and VITE_APLUS1_PX_ENABLED=true + VITE_APLUS1_FULL_PRODUCT=true).
 */
export function isAplus1GiftEconomyEnabled(): boolean {
  if (!isAplus1PxEnabled()) return false;
  return import.meta.env.VITE_APLUS1_GIFT_ECONOMY_ENABLED === "true";
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

/**
 * Full Grid project editor — paused; focus on Casual module canvas first.
 * Re-enable with VITE_APLUS1_FULL_GRID_ENABLED=true
 * (existing flex_grid projects still open in Full Grid when editing).
 */
export function isLaunchFullGridEditorEnabled(): boolean {
  return import.meta.env.VITE_APLUS1_FULL_GRID_ENABLED === "true";
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

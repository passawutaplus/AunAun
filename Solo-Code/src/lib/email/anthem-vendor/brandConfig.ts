/**
 * SAMECOR — SAME + CORE.
 * Tagline: You Create. We Connect.
 * Promise: 1 Profile. 100+ Opportunities.
 * Public host is samecor.com. aplus1.app stays as a redirect.
 */

/** ชื่อทางการ / SEO / กฎหมาย */
export const BRAND_NAME = "SAMECOR";

/** โดเมนหลัก (production) */
export const BRAND_DOMAIN = "samecor.com";

/** Production URL */
export const SAMECOR_PRODUCTION_URL = "https://samecor.com";

/** @deprecated use SAMECOR_PRODUCTION_URL */
export const APLUS1_PRODUCTION_URL = SAMECOR_PRODUCTION_URL;

/** Forum lives on the apex. forum.aplus1.app and forum.samecor.com redirect here. */
export const FORUM_URL = "https://samecor.com/forum";
export const FORUM_PATH = "/forum";

/** URL เดโม่บน Vercel */
export const APLUS1_DEMO_URL = "https://aplus1-demo.vercel.app";

/** @deprecated use APLUS1_PRODUCTION_URL */
export const ANTHEM_PRODUCTION_URL = APLUS1_PRODUCTION_URL;

/** @deprecated use APLUS1_DEMO_URL */
export const ANTHEM_DEMO_URL = APLUS1_DEMO_URL;

export const BRAND_TAGLINE = "1 โปรไฟล์ สู่ 100+ โอกาส";

export const BRAND_TAGLINE_EN = "1 Profile. 100+ Opportunities.";

export const BRAND_SUBLINE_EN = "You Create. We Connect.";

export const BRAND_DESCRIPTION =
  "SAMECOR เชื่อมผลงานของคุณกับคน โปรเจกต์ และโอกาสถัดไป — You Create. We Connect.";

/** ใช้บริบทที่ต้องการมุมมองเพิ่ม — อย่าแสดงคู่กับ BRAND_TAGLINE ในหน้าเดียว */
export const BRAND_CONCEPT = "Your work says who you are. SAMECOR connects it to what’s next.";

export const BRAND_HERO_SUBTITLE = "You Create. We Connect.";

/** ตัวอักษรในกล่องเล็ก จนกว่าไฟล์โลโก้จริงจะนิ่ง */
export const BRAND_MARK = "S";

/** Path โลโก้ wordmark (public) */
export const BRAND_LOGO_PATH = "/brand/aplus1-wordmark.png";

export const BRAND_COMPANY = "SAMECOR";

export const BRAND_SUPPORT_EMAIL = "support@aplus1.app";
export const BRAND_PRIVACY_EMAIL = "privacy@aplus1.app";

/**
 * Official LINE contact (OA / lin.ee).
 * Empty until the account is ready — menu still shows, click explains it's coming.
 */
export const BRAND_LINE_CONTACT_URL = "";

/** Opens LINE OA in a new tab. Returns false when the URL is not set yet. */
export function openBrandLineContact(): boolean {
  const url = BRAND_LINE_CONTACT_URL.trim();
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/** คีย์ภายใน (คงเดิมเพื่อไม่รีเซ็ต localStorage / session ของผู้ใช้เดิม) */
export const BRAND_STORAGE_THEME = "an1hem-theme";
export const BRAND_STORAGE_FEED_GRID = "an1hem-feed-grid-density-v2";
export const BRAND_STORAGE_FEED_AREA = "an1hem-feed-area-layout";
export const BRAND_STORAGE_FEED_GRID_MOBILE = "an1hem-feed-grid-mobile";
export const BRAND_STORAGE_FEED_AREA_MOBILE = "an1hem-feed-area-mobile";
export const BRAND_STORAGE_ONBOARDING = "an1hem_onboarding";
export const BRAND_STORAGE_NO_PERSIST = "an1hem_no_persist";

/** คีย์ ecosystem ข้ามแอป (So1o อาจอ้างอิงค่านี้) — อย่าเปลี่ยน */
export const BRAND_ECOSYSTEM_KEY = "anthem";

export function defaultSiteUrl(): string {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_SITE_URL as string | undefined)
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return APLUS1_DEMO_URL;
}

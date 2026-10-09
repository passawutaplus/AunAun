/**
 * SAMECOR brand — creative social app สำหรับคนสร้างสรรค์
 * 1 Profile. 100+ Opportunities.
 */

/** ชื่อทางการ / SEO / กฎหมาย */
export const BRAND_NAME = "SAMECOR";

/** โดเมนหลัก (production) */
export const BRAND_DOMAIN = "samecor.com";

/** Production URL */
export const APLUS1_PRODUCTION_URL = "https://samecor.com";

/** URL เดโม่บน Vercel */
export const APLUS1_DEMO_URL = "https://aplus1-demo.vercel.app";

/** @deprecated use APLUS1_PRODUCTION_URL */
export const ANTHEM_PRODUCTION_URL = APLUS1_PRODUCTION_URL;

/** @deprecated use APLUS1_DEMO_URL */
export const ANTHEM_DEMO_URL = APLUS1_DEMO_URL;

export const BRAND_TAGLINE = "1 โปรไฟล์ สู่ 100+ โอกาส";

export const BRAND_TAGLINE_EN = "1 Profile. 100+ Opportunities.";

export const BRAND_SUBLINE_EN = "You create. We connect.";

export const BRAND_DESCRIPTION =
  "SAMECOR เชื่อมผลงานของคุณกับคน โปรเจกต์ และโอกาสถัดไป — You Create. We Connect.";

/** ใช้บริบทที่ต้องการมุมมองเพิ่ม — อย่าแสดงคู่กับ BRAND_TAGLINE ในหน้าเดียว */
export const BRAND_CONCEPT = "พื้นที่ของโอกาสใหม่ๆ";

export const BRAND_HERO_SUBTITLE = "creative social app";

/** โลโก้ mark ในกล่อง */
export const BRAND_MARK = "S";

/** Path โลโก้ wordmark (public) */
export const BRAND_LOGO_PATH = "/brand/aplus1-wordmark.png";

export const BRAND_COMPANY = "SAMECOR";

export const BRAND_SUPPORT_EMAIL = "support@aplus1.app";
export const BRAND_PRIVACY_EMAIL = "privacy@aplus1.app";

/** คีย์ภายใน (คงเดิมเพื่อไม่รีเซ็ต localStorage / session ของผู้ใช้เดิม) */
export const BRAND_STORAGE_THEME = "an1hem-theme";
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

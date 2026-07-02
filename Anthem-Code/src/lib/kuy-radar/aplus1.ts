import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_TAGLINE_EN,
} from "@/lib/brandConfig";

/** Kuy Radar scope — intelligence สำหรับ growth ของ Aplus1 เท่านั้น */
export const KUY_RADAR_PRODUCT_NAME = "Kuy Radar";
export const KUY_RADAR_SCOPE_LABEL_TH = `${BRAND_NAME} Growth Intelligence`;
export const KUY_RADAR_SCOPE_LABEL_EN = `${BRAND_NAME} Growth Intelligence`;

export const KUY_APLUS1_DEFAULT_BUSINESS = {
  business_name: BRAND_NAME,
  category: "Creative Social Platform",
  product_service: "แพลตฟอร์มโปรไฟล์ ผลงาน งานจ้าง คอลแลป และชุมชนครีเอทีฟ",
  target_customer: "ฟรีแลนซ์ ดีไซน์เนอร์ นักสร้างสรรค์ สตูดิโอ และแบรนด์ที่ต้องการจ้างงาน",
  location: "ประเทศไทย",
  main_keyword:
    "ฟรีแลนซ์, portfolio, จ้างดีไซน์, สตูดิโอ, คอลแลป, creative job, aplus1, ผลงานดีไซน์",
  pain_points: [
    "หาฟรีแลนซ์ที่เหมาะกับงานยาก",
    "โปรไฟล์ไม่โดดเด่นพอในตลาดงานครีเอทีฟ",
    "ไม่รู้จะเขียนประกาศจ้างให้ดึงดูดคนเก่ง",
    "คู่แข่งแพลตฟอร์มดึงครีเอทีฟไปด้วยคอนเทนต์และโปรโมชัน",
  ],
  goals: [
    "Acquire Creators",
    "Acquire Hiring Brands",
    "Grow Studios & Collabs",
    "Content & Ads Insight",
  ],
  preferred_platforms: ["TikTok", "Instagram", "Facebook", "LinkedIn", "YouTube"],
} as const;

/** กลุ่ม use case ที่เกี่ยวกับ Aplus1 โดยตรง — ไม่ใช่เทมเพลตธุรกิจทั่วไป */
export const KUY_APLUS1_PRESETS = [
  "Aplus1 Platform Growth",
  "Creator Acquisition",
  "Brand / Hiring Lead Gen",
  "Studio & Collab Growth",
  "Community & Feed Engagement",
  "Jobs Marketplace",
  "Referral & PX Campaign",
] as const;

export const KUY_APLUS1_PROMPT_TASKS = [
  "Analyze creator signup intent",
  "Score brand hiring lead quality",
  "Summarize competitor platform strategy",
  "Generate Aplus1 marketing insight",
  "Plan ads for creator vs hirer funnel",
  "Draft compliant outreach to creators",
] as const;

export const KUY_APLUS1_METRICS = {
  creatorLeads: 428,
  hiringLeads: 186,
  studioSignals: 52,
  communityKeywords: 34,
  contentAngles: 41,
  adsOpportunities: 14,
  outreachDue: 67,
  complianceHealth: 98,
} as const;

export function kuyBrandSubtitle(lang: "th" | "en"): string {
  if (lang === "en") {
    return `${BRAND_TAGLINE_EN} — find creators, hirers, and studio signals for ${BRAND_NAME}.`;
  }
  return `${BRAND_TAGLINE} — หา creator, แบรนด์จ้างงาน และสัญญาณสตูดิโอสำหรับ ${BRAND_NAME}`;
}

export function kuyBrandDescription(lang: "th" | "en"): string {
  if (lang === "en") {
    return `Admin intelligence for ${BRAND_NAME} only: public signals and manual imports to grow creators, hiring brands, studios, and community — never generic SMB templates.`;
  }
  return `เครื่องมือข่าวกรองเฉพาะ ${BRAND_NAME}: ใช้สัญญาณสาธารณะและข้อมูลที่ทีมนำเข้าเอง เพื่อดึง creator แบรนด์จ้างงาน สตูดิโอ และชุมชน — ไม่ใช่เทมเพลตธุรกิจทั่วไป`;
}

export { BRAND_DESCRIPTION, BRAND_NAME };

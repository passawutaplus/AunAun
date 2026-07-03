import type { MarketingLanguage, MarketingLeadStatus } from "./types";
import { BRAND_NAME, marketingBrandDescription, marketingBrandSubtitle } from "./aplus1";

export type MarketingUiLanguage = "th" | "en";

const dict = {
  th: {
    overview: "ภาพรวม",
    setup: "ตั้งค่า Aplus1",
    signals: "สัญญาณในแอป",
    leads: "Lead ครีเอทีฟ & จ้างงาน",
    competitors: "คู่แข่งแพลตฟอร์ม",
    content: "คอนเทนต์ & ฟีด",
    insights: "AI Insight",
    ads: "Ads Planner",
    offers: "Offer Builder",
    planner: "Content Planner",
    outreach: "Outreach",
    reports: "รายงาน",
    settings: "ตั้งค่า",
    manual: "คู่มือ",
    commandCenter: "Marketing",
    subtitle: marketingBrandSubtitle("th"),
    productScope: `เฉพาะ ${BRAND_NAME} — ไม่ใช่เทมเพลตธุรกิจทั่วไป`,
    publicDataOnly: "ข้อมูลสาธารณะ + นำเข้าเองเท่านั้น",
    selectBusiness: "เลือกกลุ่มเป้าหมาย",
    noBusiness: `ยังไม่มี scope — ตั้งค่า growth ${BRAND_NAME} ก่อน`,
    complianceBanner: `PDPA: ใช้เฉพาะข้อมูลที่มีสิทธิ์สำหรับ growth ${BRAND_NAME} และอย่า spam outreach`,
    aiDisclaimer: "AI ช่วยตัดสินใจ growth — ไม่ใช่ข้อเท็จจริง 100%",
    exportConfirm:
      "ยืนยันว่า export นี้ใช้เพื่อ growth Aplus1 เท่านั้น ไม่มีข้อมูลส่วนบุคคลอ่อนไหว และไม่ spam",
    status: {
      new: "ใหม่",
      reviewed: "ตรวจแล้ว",
      qualified: "คุณสมบัติผ่าน",
      contacted: "ติดต่อแล้ว",
      follow_up: "ติดตาม",
      converted: "สมัคร/จ้างแล้ว",
      not_relevant: "ไม่เกี่ยวข้อง",
      archived: "เก็บถาวร",
    } satisfies Record<MarketingLeadStatus, string>,
  },
  en: {
    overview: "Overview",
    setup: "Aplus1 Setup",
    signals: "In-app signals",
    leads: "Creator & hire leads",
    competitors: "Platform competitors",
    content: "Content & feed",
    insights: "AI Insight",
    ads: "Ads Planner",
    offers: "Offer Builder",
    planner: "Content Planner",
    outreach: "Outreach",
    reports: "Reports",
    settings: "Settings",
    manual: "Manual",
    commandCenter: "Marketing",
    subtitle: marketingBrandSubtitle("en"),
    productScope: `${BRAND_NAME} only — not generic SMB templates`,
    publicDataOnly: "Public data + manual import only",
    selectBusiness: "Select growth scope",
    noBusiness: `No scope yet — configure ${BRAND_NAME} growth first`,
    complianceBanner: `PDPA: permitted data for ${BRAND_NAME} growth only; no spam outreach`,
    aiDisclaimer: "AI supports growth decisions — not guaranteed fact",
    exportConfirm:
      "I confirm this export is for Aplus1 growth only, avoids sensitive PII, and will not be used for spam",
    status: {
      new: "New",
      reviewed: "Reviewed",
      qualified: "Qualified",
      contacted: "Contacted",
      follow_up: "Follow-up",
      converted: "Signed up / hired",
      not_relevant: "Not relevant",
      archived: "Archived",
    } satisfies Record<MarketingLeadStatus, string>,
  },
} as const;

export function marketingT(lang: MarketingUiLanguage, key: keyof typeof dict.th): string {
  const v = dict[lang][key];
  return typeof v === "string" ? v : key;
}

export function marketingProductDescription(lang: MarketingUiLanguage): string {
  return marketingBrandDescription(lang);
}

export function marketingStatusLabel(lang: MarketingUiLanguage, status: MarketingLeadStatus): string {
  return dict[lang].status[status];
}

export function resolveUiLanguage(pref: MarketingLanguage): MarketingUiLanguage {
  if (pref === "en") return "en";
  return "th";
}

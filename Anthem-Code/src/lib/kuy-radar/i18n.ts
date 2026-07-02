import type { KuyLanguage, KuyLeadStatus } from "./types";
import { BRAND_NAME, kuyBrandDescription, kuyBrandSubtitle } from "./aplus1";

export type KuyUiLanguage = "th" | "en";

const dict = {
  th: {
    overview: "ภาพรวม",
    setup: "ตั้งค่า Aplus1",
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
    commandCenter: "Kuy Radar",
    subtitle: kuyBrandSubtitle("th"),
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
    } satisfies Record<KuyLeadStatus, string>,
  },
  en: {
    overview: "Overview",
    setup: "Aplus1 Setup",
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
    commandCenter: "Kuy Radar",
    subtitle: kuyBrandSubtitle("en"),
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
    } satisfies Record<KuyLeadStatus, string>,
  },
} as const;

export function kuyT(lang: KuyUiLanguage, key: keyof typeof dict.th): string {
  const v = dict[lang][key];
  return typeof v === "string" ? v : key;
}

export function kuyProductDescription(lang: KuyUiLanguage): string {
  return kuyBrandDescription(lang);
}

export function kuyStatusLabel(lang: KuyUiLanguage, status: KuyLeadStatus): string {
  return dict[lang].status[status];
}

export function resolveUiLanguage(pref: KuyLanguage): KuyUiLanguage {
  if (pref === "en") return "en";
  return "th";
}

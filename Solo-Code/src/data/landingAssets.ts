import shotDashboard from "@/assets/landing/mock-dashboard.svg";
import shotQuotation from "@/assets/landing/mock-quotation.svg";
import shotTax from "@/assets/landing/mock-tax.svg";
import shotBrief from "@/assets/landing/mock-brief.svg";
import shotTrack from "@/assets/landing/mock-track.svg";
import shotInvoice from "@/assets/landing/mock-invoice.svg";
import shotJobs from "@/assets/landing/mock-dashboard.svg";
import shotFeedback from "@/assets/landing/mock-track.svg";
import shotIncome from "@/assets/landing/mock-tax.svg";
import shotQtList from "@/assets/landing/mock-quotation.svg";
import shotWht from "@/assets/landing/mock-tax.svg";

export type LandingMockup = {
  src: string;
  alt: string;
  label?: string;
};

/** Real app screenshots — 11 unique images, regenerate via scripts/capture-landing-screenshots-win.mjs */
export const LANDING_MOCKUPS = {
  heroSlides: [
    { src: shotDashboard, alt: "So1o Dashboard — ภาพรวมหลังบ้าน", label: "Dashboard" },
    { src: shotQuotation, alt: "ใบเสนอราคา So1o", label: "ใบเสนอราคา" },
    { src: shotTax, alt: "หน้าภาษี So1o", label: "ภาษี" },
  ] satisfies LandingMockup[],
  features: {
    jobs: { src: shotJobs, alt: "Job Tracker — ติดตามงานลูกค้า" },
    manage: { src: shotFeedback, alt: "Feedback และ revision ลูกค้า" },
    finance: { src: shotIncome, alt: "บันทึกรายได้และ WHT" },
  },
  workflow: [
    { src: shotBrief, alt: "Smart Brief", label: "Brief" },
    { src: shotQtList, alt: "รายการใบเสนอราคา", label: "QT" },
    { src: shotTrack, alt: "Track งาน", label: "Track" },
    { src: shotInvoice, alt: "ใบแจ้งหนี้", label: "Invoice" },
    { src: shotWht, alt: "ใบหัก ณ ที่จ่าย 50 ทวิ", label: "Tax" },
  ] satisfies LandingMockup[],
} as const;

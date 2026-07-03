import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MarketingCard } from "./MarketingShell";

const sectionsTh = [
  {
    title: "เริ่มต้น",
    body: `ตั้งค่า growth scope ของ ${BRAND_NAME} → กำหนด keyword creator / แบรนด์จ้างงาน / สตูดิโอ / คอลแลป`,
  },
  {
    title: "Lead ครีเอทีฟ & จ้างงาน",
    body: "นำเข้า CSV/URL จากสัญญาณสาธารณะ — ต้องมี source_url ทุกแถว ระบบคำนวณ score สำหรับ funnel สมัครและจ้าง",
  },
  {
    title: "คู่แข่งแพลตฟอร์ม",
    body: "ติดตาม Behance, Fastwork และ marketplace อื่น — หาช่องว่าง portfolio + jobs + community ของ Aplus1",
  },
  {
    title: "AI Insight",
    body: "รันงาน AI เฉพาะ growth Aplus1 — ผลลัพธ์ช่วยตัดสินใจ ไม่ใช่ข้อเท็จจริง 100%",
  },
  {
    title: "Export",
    body: "ยืนยัน compliance ก่อน CSV/XLSX/PDF ทุกครั้ง — ใช้เพื่อ growth Aplus1 เท่านั้น",
  },
];

const sectionsEn = [
  {
    title: "Getting started",
    body: `Configure ${BRAND_NAME} growth scope → keywords for creators, hirers, studios, collabs`,
  },
  {
    title: "Creator & hire leads",
    body: "Import CSV/URL from public signals — source_url required; scores support signup and hiring funnels",
  },
  {
    title: "Platform competitors",
    body: "Track Behance, Fastwork, etc. — find gaps for Aplus1 portfolio + jobs + community",
  },
  {
    title: "AI Insight",
    body: "Run Aplus1-only growth tasks — decision support, not guaranteed fact",
  },
  {
    title: "Export",
    body: "Confirm compliance before any export — Aplus1 growth use only",
  },
];

export default function MarketingManualPage() {
  const { uiLanguage } = useMarketingContext();
  const sections = uiLanguage === "th" ? sectionsTh : sectionsEn;

  return (
    <MarketingCard className="p-5">
      <h2 className="text-lg font-semibold text-admin-fg">
        {uiLanguage === "th" ? `คู่มือ Marketing สำหรับ ${BRAND_NAME}` : `Marketing manual for ${BRAND_NAME}`}
      </h2>
      <div className="mt-4 space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border border-admin-border bg-admin-hover/30 p-4">
            <h3 className="font-semibold text-admin-fg">{s.title}</h3>
            <p className="mt-1 text-sm leading-6 text-admin-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </MarketingCard>
  );
}

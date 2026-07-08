import type { DrillCategory } from "@/data/designDrillPrompts.vendored";
import type { PickedDrill } from "@/lib/designDrillPick.vendored";

const CATEGORY_DESCRIPTIONS: Record<DrillCategory, string> = {
  logo: "ออกแบบโลโก้ที่สื่อจุดประสงค์ของแบรนด์และใช้งานได้จริงในหลายสถานการณ์",
  uiux: "ออกแบบหน้าจอหรือ flow ที่ใช้งานง่ายและสื่อความหมายชัดเจน",
  poster: "ออกแบบโปสเตอร์ที่ดึงสายตาและสื่อข้อความหลักได้ทันที",
  social: "ออกแบบคอนเทนต์สำหรับโซเชียลที่อ่านง่ายและโดดเด่นใน feed",
  illustration: "วาดภาพประกอบที่เข้ากับโทนและบริบทของงาน",
  branding: "ออกแบบเอกลักษณ์แบรนด์ให้ทีมนำไปใช้งานจริงได้อย่างสม่ำเสมอ",
  typography: "จัดระบบตัวอักษรที่อ่านง่ายและสะท้อนบุคลิกของแบรนด์",
};

const CATEGORY_PREVIEW: Record<DrillCategory, string> = {
  logo: "/drill-previews/logo.svg",
  uiux: "/drill-previews/uiux.svg",
  poster: "/drill-previews/poster.svg",
  social: "/drill-previews/social.svg",
  illustration: "/drill-previews/illustration.svg",
  branding: "/drill-previews/branding.svg",
  typography: "/drill-previews/typography.svg",
};

const CONSTRAINT_FRIENDLY: Record<string, string> = {
  "ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ": "จำกัดพาเลตสีให้กระชับและใช้งานง่าย",
  "ห้ามใช้ gradient": "ใช้สีทึบ ไม่ใช้ gradient",
  "ต้องทำงานได้ทั้งพื้นเข้มและพื้นอ่อน": "ออกแบบให้ใช้ได้ทั้งพื้นเข้มและพื้นอ่อน",
  "ใช้ฟอนต์เดียวทั้งชิ้น": "ใช้ฟอนต์เดียวทั้งชิ้นงาน",
  "ห้ามใช้ stock photo": "ไม่ใช้ stock photo",
  "ต้องมี negative space อย่างน้อย 40%": "เว้นพื้นที่ว่างให้งานโปร่งและอ่านง่าย",
  "ออกแบบให้เห็นชัดใน thumbnail 120px": "มองเห็นชัดแม้ย่อเป็นขนาดเล็ก",
  "ใช้ geometric shape เป็นหลัก": "ใช้รูปทรงเรขาคณิตเป็นหลัก",
  "ห้ามใช้ drop shadow": "ไม่ใช้ drop shadow",
  "ต้องมี wordmark + symbol": "มีทั้ง wordmark และ symbol",
  "จำกัด canvas 1:1 เท่านั้น": "ออกแบบในสัดส่วน 1:1",
  "ใช้ grid 8px ทั้งชิ้น": "จัด layout ด้วย grid 8px",
  "ห้ามใช้ illustration ตัวการ์ตูน": "ไม่ใช้สไตล์การ์ตูน",
  "ต้อง responsive 3 breakpoints": "รองรับ 3 breakpoints",
  "ใช้ icon จาก Lucide/Feather เท่านั้น": "ใช้ icon จาก Lucide/Feather เท่านั้น",
};

function simplifyBrief(brief: string): string {
  const colonIdx = brief.indexOf(":");
  if (colonIdx > 0 && colonIdx < 72) return brief.slice(0, colonIdx).trim();
  return brief;
}

export function difficultyDisplayLabel(label: string): string {
  return `ระดับ${label}`;
}

export function getDrillDisplayCopy(drill: PickedDrill) {
  const { template, category, constraints } = drill;

  return {
    title: template.friendlyTitle ?? simplifyBrief(template.brief),
    description: template.friendlyDescription ?? CATEGORY_DESCRIPTIONS[category],
    deliverables:
      template.deliverables ??
      constraints.map((c) => CONSTRAINT_FRIENDLY[c] ?? c),
    previewImage: template.previewImage ?? CATEGORY_PREVIEW[category],
  };
}

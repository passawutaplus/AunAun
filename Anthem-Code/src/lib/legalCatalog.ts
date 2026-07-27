/** หมวดเอกสารกฎหมาย — ใช้ร่วมใน hub และ LegalNav */

export type LegalDoc = {
  to: string;
  label: string;
  shortLabel: string;
  summary: string;
};

export type LegalCategory = {
  id: string;
  title: string;
  summary: string;
  docs: readonly LegalDoc[];
};

export const LEGAL_CATEGORIES = [
  {
    id: "platform",
    title: "การใช้บริการ",
    summary: "ข้อกำหนดหลักและความสัมพันธ์กับแพลตฟอร์ม",
    docs: [
      {
        to: "/legal/terms",
        label: "ข้อกำหนดการใช้งาน",
        shortLabel: "ข้อกำหนด",
        summary: "เงื่อนไขการใช้บัญชี เนื้อหา และความรับผิดของแพลตฟอร์ม",
      },
      {
        to: "/legal/service-agreement",
        label: "ข้อตกลงการจ้างงาน",
        shortLabel: "ข้อตกลงจ้าง",
        summary: "ขอบเขตงาน การส่งมอบ และหน้าที่ของผู้จ้างกับฟรีแลนซ์",
      },
    ],
  },
  {
    id: "privacy",
    title: "ความเป็นส่วนตัวและข้อมูล",
    summary: "PDPA การเก็บข้อมูล คุกกี้ และสิทธิของคุณ",
    docs: [
      {
        to: "/legal/privacy",
        label: "นโยบายความเป็นส่วนตัว (PDPA)",
        shortLabel: "ความเป็นส่วนตัว",
        summary: "เก็บ ใช้ เปิดเผย และคุ้มครองข้อมูลส่วนบุคคลอย่างไร",
      },
      {
        to: "/legal/cookies",
        label: "นโยบายคุกกี้",
        shortLabel: "คุกกี้",
        summary: "ประเภทคุกกี้ที่ใช้ และการตั้งค่าความยินยอม",
      },
      {
        to: "/legal/rights",
        label: "สิทธิเจ้าของข้อมูล",
        shortLabel: "สิทธิข้อมูล",
        summary: "ขอดู แก้ไข ลบ หรือถอนความยินยอมข้อมูลส่วนบุคคล",
      },
    ],
  },
  {
    id: "finance",
    title: "การเงินและการยืนยันตัวตน",
    summary: "ชำระเงิน คืนเงิน และ KYC / AML",
    docs: [
      {
        to: "/legal/payment-refund",
        label: "การชำระเงินและการคืนเงิน",
        shortLabel: "ชำระเงิน",
        summary: "ค่าธรรมเนียม การโอนเงิน และการขอคืนเงิน",
      },
      {
        to: "/legal/kyc-aml",
        label: "KYC · PEP · บัญชีคว่ำบาตร",
        shortLabel: "KYC / AML",
        summary: "ทำไมต้องยืนยันตัวตน เปิดเผย PEP และรับรอง Sanctions",
      },
    ],
  },
  {
    id: "content",
    title: "เนื้อหา ลิขสิทธิ์ และชุมชน",
    summary: "สิทธิผลงาน กฎชุมชน และการแจ้งละเมิด",
    docs: [
      {
        to: "/legal/ip",
        label: "ลิขสิทธิ์และการใช้งานผลงาน",
        shortLabel: "ลิขสิทธิ์",
        summary: "สิทธิในผลงานที่อัปโหลด และการยืนยันความเป็นเจ้าของ",
      },
      {
        to: "/legal/community",
        label: "กฎชุมชน",
        shortLabel: "กฎชุมชน",
        summary: "พฤติกรรมที่ยอมรับได้ และการดูแลความปลอดภัย",
      },
      {
        to: "/legal/copyright-report",
        label: "แจ้งละเมิดลิขสิทธิ์",
        shortLabel: "แจ้งลิขสิทธิ์",
        summary: "แบบฟอร์มแจ้งเนื้อหาที่ละเมิดสิทธิของคุณ",
      },
    ],
  },
] as const satisfies readonly LegalCategory[];

export function findLegalDoc(pathname: string): LegalDoc | undefined {
  for (const cat of LEGAL_CATEGORIES) {
    const hit = cat.docs.find((d) => d.to === pathname);
    if (hit) return hit;
  }
  return undefined;
}

export function findLegalCategory(pathname: string): LegalCategory | undefined {
  return LEGAL_CATEGORIES.find((cat) => cat.docs.some((d) => d.to === pathname));
}

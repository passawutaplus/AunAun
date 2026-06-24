export interface LegalScenario {
  id: string;
  title: string;
  summary: string;
  advice: string;
  linkTab?: { section: string; sub?: string; label: string };
}

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

export const LEGAL_INTRO = {
  title: "รู้จักลิขสิทธิ์ใน 3 นาที",
  points: [
    {
      term: "ลิขสิทธิ์ (Copyright)",
      desc: "สิทธิ์ของคนสร้างงาน — โดยปกติคุณเป็นเจ้าของจนกว่าจะโอนให้ลูกค้า",
    },
    {
      term: "สิทธิใช้งาน (Usage Rights)",
      desc: "ลูกค้าใช้งานได้แค่ไหน ช่องทางไหน นานแค่ไหน — ต้องระบุให้ชัดในใบเสนอราคา",
    },
    {
      term: "ทรัพย์สินทางปัญญา (IP)",
      desc: "รวมโลโก้ ดีไซน์ โค้ด คอนเทนต์ — สิ่งที่มีมูลค่าและควรปกป้อง",
    },
  ],
};

export const LEGAL_SCENARIOS: LegalScenario[] = [
  {
    id: "source-before-pay",
    title: "ลูกค้าขอไฟล์ต้นฉบับก่อนจ่าย",
    summary: "เจอบ่อยมาก — โดยเฉพาะงานโลโก้/ดีไซน์",
    advice:
      "ส่งเฉพาะ preview หรือ watermark ก่อน ระบุในใบเสนอราคาว่าไฟล์ต้นฉบับ (AI/PSD) ส่งเมื่อชำระครบ ถ้าลูกค้าต้องการเร่ง ให้รับมัดจำก่อนแล้วค่อยปลดล็อก",
  },
  {
    id: "resell-work",
    title: "ลูกค้าเอางานไปขายต่อ / ใส่แพ็กเกจ",
    summary: "ถ้าไม่ได้ตกลงไว้ ลูกค้าไม่ควรนำไปจำหน่ายต่อ",
    advice:
      "ใช้สิทธิ์แบบ Non-Exclusive + จำกัดช่องทาง หรือ Exclusive ถ้าคิดราคาเต็ม ระบุชัดว่าห้ามขายต่อ/ sublicense โดยไม่ได้รับอนุญาต",
  },
  {
    id: "font-license",
    title: "ใช้ฟอนต์ฟรีในงานลูกค้าได้ไหม?",
    summary: "ขึ้นกับ license ของฟอนต์นั้นๆ",
    advice:
      "ตรวจใน Assets ว่าฟอนต์เป็น Personal หรือ Commercial ฟอนต์ฟรีบางตัวห้ามใช้งานเชิงพาฎิกธิกรรม — บันทึกไว้ก่อนเริ่มงาน",
    linkTab: { section: "mydata", sub: "assets", label: "ไปที่ Assets" },
  },
  {
    id: "wht-50twi",
    title: "หัก ณ ที่จ่าย + ใบ 50 ทวิ",
    summary: "ลูกค้านิติบุคคลมักหัก 3% และออก 50 ทวิ",
    advice:
      "ใส่ข้อตกลงในใบเสนอราคาและสัญญา เก็บหลักฐานการชำระเงินใน Job Tracker และบันทึกรายได้ในแท็บภาษี",
    linkTab: { section: "finance", sub: "tax", label: "ไปที่ภาษี" },
  },
];

export const PRE_DELIVERY_CHECKLIST: ChecklistItem[] = [
  {
    id: "rights-set",
    label: "ตั้งสิทธิลิขสิทธิ์ในใบเสนอราคาแล้ว",
    hint: "Usage Rights Builder ใน Pipeline",
  },
  { id: "contract-signed", label: "ยืนยันสัญญา/เงื่อนไขกับลูกค้าแล้ว" },
  { id: "deposit-received", label: "รับมัดจำแล้ว (ถ้าตกลงไว้)" },
  { id: "fonts-checked", label: "ตรวจสอบ license ฟอนต์/สต็อกที่ใช้ในงาน" },
  { id: "watermark-ok", label: "ไฟล์ preview มี watermark ก่อนปลดล็อก" },
  { id: "deliverables-match", label: "ไฟล์ส่งมอบตรงตามที่ตกลง (PNG/PDF/Source)" },
  { id: "certificate-ready", label: "ออกใบรับรองสิทธิ์ให้ลูกค้า (ถ้าต้องการ)" },
];

export const CLIENT_MESSAGE_TEMPLATES = [
  {
    id: "send-terms",
    title: "ส่งเงื่อนไขให้ลูกค้า",
    body: "สวัสดีครับ/ค่ะ\n\nแนบใบเสนอราคาพร้อมเงื่อนไขการใช้งานและลิขสิทธิ์ไว้ให้แล้ว หากตกลงตามเงื่อนไข รบกวนแจ้งกลับเพื่อเริ่มงานได้เลยครับ/ค่ะ\n\nขอบคุณครับ/ค่ะ",
  },
  {
    id: "source-after-pay",
    title: "ขอชำระก่อนส่งไฟล์ต้นฉบับ",
    body: "สวัสดีครับ/ค่ะ\n\nไฟล์ต้นฉบับ (AI/PSD) จะส่งมอบเมื่อชำระค่าบริการครบตามใบเสนอราคา ตอนนี้ส่ง preview ให้ตรวจสอบก่อนนะครับ/ค่ะ\n\nขอบคุณครับ/ค่ะ",
  },
];

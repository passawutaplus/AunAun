/** ข้อความมาตรฐาน — แก้ที่เดียว ใช้ทั้ง UI, AI, และ edge functions */

export const DISCLAIMER_TAX_PRICE = "คำแนะนำเบื้องต้น — ดูหน้างานจริงก่อนตัดสินใจ";

export const DISCLAIMER_TAX_ESTIMATE = "ค่าที่แสดงเป็นประมาณการ — ปรึกษานักบัญชีก่อนยื่นจริง";

export const DISCLAIMER_TAX_ACCOUNTING =
  "คำแนะนำเบื้องต้น ไม่ใช่คำปรึกษาทางบัญชี — ปรึกษานักบัญชีก่อนยื่นจริง";

export const DISCLAIMER_LEGAL = "คำแนะนำเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมาย";

export const DISCLAIMER_LEGAL_FULL =
  "คำแนะนำเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมาย — กรณีสำคัญแนะนำปรึกษาทนายความ";

export const DISCLAIMER_ESIGN_TOOL =
  "เครื่องมือช่วยจัดทำเอกสารเท่านั้น — ไม่ใช่คำปรึกษาทางกฎหมายหรือบริการลงนามอิเล็กทรอนิกส์ตามกฎหมาย";
export const DISCLAIMER_ESIGN_FREELANCER =
  "คุณเป็นผู้รับผิดชอบในการขอความยินยอมจากลูกค้าและความถูกต้องของเอกสาร — So1o เป็นเพียงแพลตฟอร์มช่วยจัดการ";
export const DISCLAIMER_ESIGN_CLIENT =
  "ข้อมูลลายเซ็นและชื่อของคุณจะถูกเก็บเพื่อยืนยันเอกสารนี้ — ฟรีแลนซ์เป็นผู้ควบคุมข้อมูลหลักในการทำงานร่วมกัน";
export const ESIGN_CONSENT_VERSION = "2026-06-v1";

/** สำหรับ AI system prompts — ต้องลงท้ายคำตอบเรื่องราคา/ภาษี */
export const AI_DISCLAIMER_TAX_PRICE_PROMPT = DISCLAIMER_TAX_PRICE;

/** สำหรับ AI system prompts — ต้องลงท้ายคำตอบเรื่องกฎหมาย */
export const AI_DISCLAIMER_LEGAL_PROMPT = `${DISCLAIMER_LEGAL} — ปรึกษาผู้เชี่ยวชาญหากเป็นเรื่องสำคัญ`;

export const RULE_BREVITY_TH = "ตอบภาษาไทย กระชับ เป็นกันเอง ไม่เกิน 3-4 ย่อหน้าสั้น";

export const DEMO_BANNER_SHORT = "โหมดทดสอบ — บันทึกได้จริง ชำระเงินเป็น sandbox";

/** อีเมล auth — ใช้ร่วมใน layout footer */
export const EMAIL_FOOTER_NOT_REQUESTED = "ไม่ได้เป็นคนทำรายการ? ลบอีเมลนี้ได้ — บัญชียังปลอดภัย";

export const EMAIL_FOOTER_NOT_SIGNED_UP = "ไม่ได้สมัคร? ลบอีเมลนี้ได้ — จะหมดอายุเอง";

export const DEMO_WARNING_BULLETS = [
  "บัญชีทดสอบบันทึกถาวร — อย่าใส่ข้อมูลส่วนตัวจริง",
  "ชำระเงินเป็น sandbox เท่านั้น",
] as const;

import type { KycRejectReasonCode } from "@/lib/kycRejectReasons";

/** Interactive checklist for admin KYC review dialog. */
export type KycReviewCheckId =
  | "docs_clear"
  | "selfie_match"
  | "name_triple_match"
  | "id_number_match"
  | "bank_ok"
  | "age_ok"
  | "pep_sanctions_ok"
  | "no_fraud_signal";

export type KycReviewCheckItem = {
  id: KycReviewCheckId;
  step: number;
  label: string;
  hint: string;
  /** Suggested reject reason if this check fails. */
  failReason?: KycRejectReasonCode;
};

export const KYC_REVIEW_CHECKLIST: KycReviewCheckItem[] = [
  {
    id: "docs_clear",
    step: 1,
    label: "เอกสารครบและอ่านได้",
    hint: "บัตรประชาชน + สมุดบัญชีชัด อ่านชื่อ/เลขได้",
    failReason: "blurry_id",
  },
  {
    id: "selfie_match",
    step: 2,
    label: "เซลฟี่คู่บัตรผ่าน",
    hint: "ใบหน้าชัด เห็นบัตรในภาพ และดูเป็นคนเดียวกับบัตร",
    failReason: "blurry_selfie",
  },
  {
    id: "name_triple_match",
    step: 3,
    label: "ชื่อตรง 3 จุด",
    hint: "ชื่อบนบัตร = ชื่อที่กรอก = ชื่อบัญชีธนาคาร",
    failReason: "name_mismatch",
  },
  {
    id: "id_number_match",
    step: 4,
    label: "เลขบัตรตรงกับภาพ",
    hint: "เลขที่กรอกตรงกับภาพบัตร (และ checksum ดูสมเหตุสมผล)",
    failReason: "id_number_mismatch",
  },
  {
    id: "bank_ok",
    step: 5,
    label: "บัญชีธนาคารใช้ได้",
    hint: "เลขบัญชีชัด ชื่อบัญชีตรงบัตร ไม่ซ้ำบัญชีคนอื่นที่สงสัย",
    failReason: "bank_name_mismatch",
  },
  {
    id: "age_ok",
    step: 6,
    label: "อายุ ≥ 18 ปี",
    hint: "คำนวณจากวันเกิดบนบัตร",
  },
  {
    id: "pep_sanctions_ok",
    step: 7,
    label: "PEP / Sanctions ผ่านเกณฑ์",
    hint: "ถ้าไม่ใช่ PEP และรับรอง sanctions → ผ่าน · ถ้าเป็น PEP ต้องมี EDD ครบแล้วใส่ note",
  },
  {
    id: "no_fraud_signal",
    step: 8,
    label: "ไม่มีสัญญาณปลอม/โกง",
    hint: "ไม่ใช่ถ่ายจอซ้ำ ตัดแปะ คนละคน หรือเอกสารผิดประเภท",
    failReason: "suspected_fraud",
  },
];

export type KycExampleVerdict = "approve" | "reject";

export type KycExampleCase = {
  id: string;
  verdict: KycExampleVerdict;
  title: string;
  facts: string[];
  action: string;
  reasonCode?: KycRejectReasonCode;
};

export const KYC_EXAMPLE_CASES: KycExampleCase[] = [
  {
    id: "ex-approve-clean",
    verdict: "approve",
    title: "ผ่าน — เอกสารชัด ชื่อตรง",
    facts: [
      "บัตรชัด อ่านชื่อและเลขได้",
      "เซลฟี่ถือบัตร ใบหน้าตรงกับรูปบนบัตร",
      "สมุดบัญชีชื่อเดียวกับบัตร",
      "เลือกไม่ใช่ PEP และรับรองไม่ติด sanctions",
      "AI risk ต่ำ (เช่น ≤ 15)",
    ],
    action: "กดอนุมัติ — ใส่ note สั้นๆ ได้ เช่น docs match, non-PEP",
  },
  {
    id: "ex-approve-pep",
    verdict: "approve",
    title: "ผ่านแบบ PEP — มี EDD ครบ",
    facts: [
      "เอกสารและชื่อตรงเหมือนเคสปกติ",
      "ผู้ใช้แจ้งว่าเป็น PEP / เกี่ยวข้องกับ PEP",
      "กรอกตำแหน่ง องค์กร ความสัมพันธ์ครบ",
      "ไม่มีสัญญาณโกง",
    ],
    action: "อนุมัติได้ แต่ต้องเขียน note ว่าตรวจ EDD แล้ว เช่น PEP: อดีต อบต. · associate",
  },
  {
    id: "ex-reject-blur",
    verdict: "reject",
    title: "ปฏิเสธ — รูปไม่ชัด",
    facts: [
      "บัตรเบลอ / สะท้อนแสง อ่านเลขไม่ได้",
      "หรือเซลฟี่มืด ใบหน้าไม่ชัด",
    ],
    action: "ปฏิเสธด้วยเหตุผลมาตรฐาน",
    reasonCode: "blurry_id",
  },
  {
    id: "ex-reject-name",
    verdict: "reject",
    title: "ปฏิเสธ — ชื่อบัญชีไม่ตรงบัตร",
    facts: [
      "บัตรชื่อ สมชาย ใจดี",
      "บัญชีชื่อ บริษัท กขค จำกัด หรือชื่อคนอื่น",
    ],
    action: "ปฏิเสธ — ห้ามอนุมัติเพื่อช่วยให้เร็ว",
    reasonCode: "bank_name_mismatch",
  },
  {
    id: "ex-reject-fraud",
    verdict: "reject",
    title: "ปฏิเสธ — สงสัยเอกสารปลอม",
    facts: [
      "ภาพดูเหมือนถ่ายจากจอ / มีขอบแอปอื่น",
      "ใบหน้าในเซลฟี่ไม่ตรงรูปบนบัตร",
      "AI risk สูงและเอกสารดูผิดปกติ",
    ],
    action: "ปฏิเสธ + ใส่ note สั้นๆ เก็บหลักฐานในระบบ",
    reasonCode: "suspected_fraud",
  },
];

export const KYC_REVIEW_RULES = [
  "AI แนะนำได้ — คนเป็นผู้ตัดสินใจเสมอ",
  "ชัดไหม → ตรงไหม → เสี่ยงไหม ถ้าไม่ผ่านข้อใดข้อหนึ่ง ให้ปฏิเสธ",
  "ปฏิเสธพร้อมเหตุผลมาตรฐาน ดีกว่าอนุมัติแล้วแก้ทีหลัง",
  "อย่าแชร์รูปบัตร/เซลฟี่ในแชทสาธารณะ",
  "เป้าหมาย: เคลียร์คิว pending ภายใน 24–48 ชม. วันทำการ",
] as const;

export function emptyKycReviewChecks(): Record<KycReviewCheckId, boolean> {
  return {
    docs_clear: false,
    selfie_match: false,
    name_triple_match: false,
    id_number_match: false,
    bank_ok: false,
    age_ok: false,
    pep_sanctions_ok: false,
    no_fraud_signal: false,
  };
}

export function allKycReviewChecksPassed(
  checks: Record<KycReviewCheckId, boolean>,
): boolean {
  return KYC_REVIEW_CHECKLIST.every((item) => checks[item.id]);
}

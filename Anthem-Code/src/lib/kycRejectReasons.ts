export type KycRejectReasonCode =
  | "blurry_id"
  | "blurry_selfie"
  | "blurry_bank_book"
  | "name_mismatch"
  | "id_number_mismatch"
  | "bank_name_mismatch"
  | "invalid_bank_account"
  | "duplicate_bank"
  | "incomplete_docs"
  | "suspected_fraud"
  | "other";

export type KycRejectReason = { code: KycRejectReasonCode; label: string };

export const KYC_REJECT_REASONS: KycRejectReason[] = [
  { code: "blurry_id", label: "ภาพบัตรประชาชนไม่ชัดหรืออ่านไม่ได้" },
  { code: "blurry_selfie", label: "รูปถ่ายคู่บัตรไม่ชัด / ใบหน้าไม่ตรง" },
  { code: "blurry_bank_book", label: "ภาพสมุดบัญชีไม่ชัด" },
  { code: "name_mismatch", label: "ชื่อที่กรอกไม่ตรงกับบัตรประชาชน" },
  { code: "id_number_mismatch", label: "เลขบัตรประชาชนไม่ตรงกับเอกสาร" },
  { code: "bank_name_mismatch", label: "ชื่อบัญชีไม่ตรงกับชื่อบนบัตร" },
  { code: "invalid_bank_account", label: "เลขบัญชีไม่ถูกต้อง" },
  { code: "duplicate_bank", label: "เลขบัญชีนี้ถูกใช้กับบัญชีอื่นแล้ว" },
  { code: "incomplete_docs", label: "เอกสารไม่ครบหรือไม่ถูกประเภท" },
  { code: "suspected_fraud", label: "พบสัญญาณที่ต้องตรวจสอบเพิ่ม" },
  { code: "other", label: "อื่นๆ (ระบุในหมายเหตุ)" },
];

export function kycRejectLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return KYC_REJECT_REASONS.find((r) => r.code === code)?.label ?? code;
}

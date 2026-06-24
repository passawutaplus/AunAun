/** รุ่นข้อความยินยอม KYC — เก็บใน shared.kyc_requests.pdpa_consent_version */
export const KYC_PDPA_CONSENT_VERSION = "2026-06-19";

export const KYC_PDPA_PURPOSES = [
  "ยืนยันตัวตนและความเป็นเจ้าของบัญชีธนาคารก่อนถอนเงิน (KYC)",
  "ป้องกันการฟอกเงินและทุจริต (AML) ตามหน้าที่ตามกฎหมาย",
  "เก็บเลขบัตรประชาชนและที่อยู่ตามที่กฎหมายกำหนดสำหรับการระบุตัวตน",
  "AI ช่วยสรุปความเสี่ยงเบื้องต้น — แอดมินเป็นผู้อนุมัติขั้นสุดท้าย",
] as const;

export const KYC_PDPA_RETENTION_NOTE =
  "เก็บเฉพาะระยะที่จำเป็น — หลังอนุมัติเก็บตามกฎหมาย AML/ภาษี (โดยทั่วไปไม่เกิน 5 ปี) หรือจนกว่าคุณขอลบและกฎหมายอนุญาต";

/** Mask bank account for list views (PDPA data minimization). */
export function maskBankAccount(accountNumber: string | null | undefined): string {
  const digits = (accountNumber ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "····";
  return `····${digits.slice(-4)}`;
}

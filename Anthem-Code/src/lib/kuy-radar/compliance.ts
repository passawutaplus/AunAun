export const COMPLIANCE_RULES_TH = [
  "ใช้เฉพาะ public data หรือข้อมูลที่ผู้ใช้มีสิทธิ์นำเข้า",
  "ไม่ bypass login, captcha, rate limit หรือ paywall",
  "ต้องมี source URL และเปิดให้ลบข้อมูลที่บันทึกไว้ได้",
  "AI insight เป็นข้อมูลช่วยตัดสินใจ ไม่ใช่ข้อเท็จจริง 100%",
  "Outreach ต้องไม่เป็น spam และต้องโปร่งใส",
] as const;

export const COMPLIANCE_RULES_EN = [
  "Use only public data or data you have permission to import",
  "Never bypass login, captcha, rate limits, or paywalls",
  "Every record must have a source URL and support deletion",
  "AI insight is decision support, not guaranteed fact",
  "Outreach must not be spam and must be transparent",
] as const;

export class ExportComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportComplianceError";
  }
}

export function assertExportAllowed(confirmed: boolean, hasSourceUrls: boolean): void {
  if (!confirmed) {
    throw new ExportComplianceError("ต้องยืนยัน compliance ก่อน export");
  }
  if (!hasSourceUrls) {
    throw new ExportComplianceError("ทุกแถวต้องมี source URL ก่อน export");
  }
}

export function assertSourceUrl(url: string | null | undefined): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    throw new Error("ต้องระบุ source URL ที่ขึ้นต้นด้วย http:// หรือ https://");
  }
  return trimmed;
}

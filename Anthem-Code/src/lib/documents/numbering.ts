import type { HireDocumentKind } from "@/lib/payments/types";

const PREFIX: Record<HireDocumentKind, string> = {
  quotation: "QT",
  invoice: "INV",
  receipt: "RCP",
  platform_fee_receipt: "FEE",
  wht_cert: "WHT",
};

/** Client-side provisional number (DB `shared.next_doc_number` is source of truth). */
export function makeProvisionalDocNumber(kind: HireDocumentKind, now = new Date()): string {
  const y = now.getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `${PREFIX[kind]}-${y}-${n}`;
}

export function docKindLabelTh(kind: HireDocumentKind): string {
  switch (kind) {
    case "quotation":
      return "ใบเสนอราคา";
    case "invoice":
      return "ใบแจ้งหนี้";
    case "receipt":
      return "ใบเสร็จรับเงิน";
    case "platform_fee_receipt":
      return "ใบเสร็จค่าธรรมเนียมแพลตฟอร์ม";
    case "wht_cert":
      return "หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)";
    default:
      return kind;
  }
}

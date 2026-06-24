import * as React from "react";
import { type DocKind, type Quotation } from "@/store/quotations";
import { FileText, FileSpreadsheet, Receipt } from "lucide-react";

export const DOC_TYPES: {
  value: DocKind;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  when: string;
}[] = [
  {
    value: "quotation",
    label: "ใบเสนอราคา",
    sub: "Quotation",
    icon: FileText,
    when: "ก่อนเริ่มงาน · ตกลงขอบเขต & ราคา",
  },
  {
    value: "invoice",
    label: "ใบแจ้งหนี้",
    sub: "Invoice",
    icon: FileSpreadsheet,
    when: "เมื่อถึงกำหนดชำระเงิน",
  },
  {
    value: "receipt",
    label: "ใบเสร็จรับเงิน",
    sub: "Receipt",
    icon: Receipt,
    when: "หลังได้รับเงินเรียบร้อย",
  },
];

export function belongsTo(q: Quotation, kind: DocKind): boolean {
  if (kind === "quotation") return true;
  if (kind === "invoice") {
    return !!q.invoiceNumber || q.status === "pending_payment";
  }
  if (kind === "receipt") {
    return !!q.receiptNumber || q.status === "pending_receipt" || q.status === "completed";
  }
  return false;
}

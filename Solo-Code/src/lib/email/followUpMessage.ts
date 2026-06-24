import { computeTotals, type Quotation } from "@/store/quotations";

export type FollowUpTone = "soft" | "formal" | "urgent";

export function daysOverdue(q: Quotation): number {
  if (!q.dueDate || q.status === "completed" || q.status === "rejected") return 0;
  const due = new Date(q.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

export function isOverdue(q: Quotation): boolean {
  return (q.status === "pending_payment" || q.status === "pending_receipt") && daysOverdue(q) > 0;
}

export function outstandingAmount(q: Quotation): number {
  const t = computeTotals(q);
  const lateFee = isOverdue(q) ? (t.grandTotal * (q.lateFeePercent || 0)) / 100 : 0;
  return Math.max(0, t.grandTotal + lateFee - (q.paidPartial || 0));
}

export function suggestTone(q: Quotation): FollowUpTone {
  const d = daysOverdue(q);
  if (d >= 14) return "urgent";
  if (d >= 7) return "formal";
  return "soft";
}

export function buildFollowUpMessage(q: Quotation, amount: number, tone: FollowUpTone): string {
  switch (tone) {
    case "soft":
      return `สวัสดีครับ/ค่ะ คุณ${q.clientName}\n\nขอแจ้งเตือนยอดชำระค่าบริการ "${q.projectName}" จำนวน ฿${amount.toLocaleString("th-TH")}\nครบกำหนดวันที่ ${q.dueDate ?? "-"}\n\nหากชำระแล้วขอบคุณมากครับ/ค่ะ 🙏`;
    case "formal":
      return `เรียน คุณ${q.clientName}\n\nขออนุญาตติดตามการชำระเงินตามใบแจ้งหนี้ ${q.invoiceNumber ?? q.number}\nยอด ฿${amount.toLocaleString("th-TH")} ซึ่งเกินกำหนดมาแล้ว ${daysOverdue(q)} วัน\n\nรบกวนแจ้งกำหนดการชำระเงินภายใน 3 วันทำการนะครับ/ค่ะ`;
    case "urgent":
      return `เรียน คุณ${q.clientName}\n\nแจ้งระงับงานชั่วคราว เนื่องจากมียอดค้างชำระตาม ${q.invoiceNumber ?? q.number} จำนวน ฿${amount.toLocaleString("th-TH")} เกินกำหนดมาแล้ว ${daysOverdue(q)} วัน\n\nกรุณาดำเนินการชำระภายใน 24 ชั่วโมง`;
  }
}

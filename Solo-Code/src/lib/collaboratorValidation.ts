import type { QuotationCollaborator } from "@/lib/quotationKinds";

export function validateCollaboratorRevenue(
  collaborators: Pick<QuotationCollaborator, "revenuePercent">[],
): { ok: true } | { ok: false; message: string } {
  const withPercent = collaborators.filter((c) => c.revenuePercent != null);
  if (withPercent.length === 0) return { ok: true };
  const total = withPercent.reduce((s, c) => s + (c.revenuePercent ?? 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, message: `สัดส่วนรายได้รวมต้องเท่ากับ 100% (ตอนนี้ ${total.toFixed(1)}%)` };
  }
  return { ok: true };
}

export function ensureSingleLead(
  collaborators: Pick<QuotationCollaborator, "role">[],
): { ok: true } | { ok: false; message: string } {
  const leads = collaborators.filter((c) => c.role === "lead");
  if (leads.length !== 1) {
    return { ok: false, message: "ต้องมี Lead 1 คนเท่านั้น" };
  }
  return { ok: true };
}

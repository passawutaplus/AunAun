import type { Quotation } from "@/store/quotations";
import { computeTotals, formatBaht } from "@/store/quotations";
import { buildCopyrightClauses } from "@/lib/buildCopyrightClauses";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";

export interface ContractClause {
  id: string;
  title: string;
  body: string;
}

export const DEFAULT_CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: "copyright",
    title: "ลิขสิทธิ์งาน",
    body: "ลิขสิทธิ์ในงานทั้งหมดโอนเป็นของผู้ว่าจ้างเมื่อชำระค่าบริการครบถ้วนแล้ว",
  },
  {
    id: "revisions",
    title: "จำนวนรอบแก้ไข",
    body: "รวมการแก้ไขฟรีตามที่ระบุในใบเสนอราคา ส่วนเกินกำหนดคิดค่าบริการเพิ่มตามที่ตกลง",
  },
  {
    id: "deposit",
    title: "มัดจำและการยกเลิก",
    body: "มัดจำตามใบเสนอราคาไม่คืนเมื่อผู้ว่าจ้างยกเลิกหลังเริ่มงานแล้ว",
  },
  {
    id: "delivery",
    title: "การส่งมอบ",
    body: "ส่งมอบไฟล์งานผ่านช่องทางดิจิทัลที่ตกลง (เช่น Job Tracker หรือลิงก์ดาวน์โหลด)",
  },
  {
    id: "wht",
    title: "ภาษีหัก ณ ที่จ่าย",
    body: "ผู้ว่าจ้างหักภาษี ณ ที่จ่ายตามกฎหมาย และออกหนังสือรับรอง 50 ทวิ ให้ผู้รับจ้าง",
  },
];

export function buildContractClausesForQuotation(
  q: Quotation,
  rights?: UsageRightsInput | null,
): ContractClause[] {
  if (rights) return buildCopyrightClauses(rights, q.revisionsCount);
  return DEFAULT_CONTRACT_CLAUSES;
}

export function buildContractDocument(
  q: Quotation,
  clauses?: ContractClause[],
  rights?: UsageRightsInput | null,
): string {
  const resolved = clauses ?? buildContractClausesForQuotation(q, rights);
  const totals = computeTotals(q);
  const lines = [
    `สัญญาจ้างบริการ — ${q.projectName}`,
    "",
    `ผู้ว่าจ้าง: ${q.clientName}`,
    q.clientTaxId ? `เลขประจำตัวผู้เสียภาษี: ${q.clientTaxId}` : "",
    "",
    `มูลค่างาน: ฿${formatBaht(totals.grandTotal)}`,
    `เงื่อนไขชำระ: ${q.paymentTerms || "ตามใบเสนอราคา"}`,
    "",
    "ข้อตกลง:",
    ...resolved.map((c, i) => `${i + 1}. ${c.title} — ${c.body}`),
    "",
    q.notes ? `หมายเหตุเพิ่มเติม: ${q.notes}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

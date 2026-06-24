import { toast } from "sonner";
import { escapeCSV } from "@/lib/security";
import { formatTHB } from "@/data/mockData";
import type { IncomeRecord } from "@/data/mockData";
import type { TaxEstimate } from "./taxMath";

export function exportAccountantPackage(opts: {
  year: number;
  incomes: IncomeRecord[];
  est: TaxEstimate;
  expenseMethod: "lumpsum" | "actual";
  brandName?: string;
}) {
  const { year, incomes, est, expenseMethod, brandName } = opts;
  const generated = new Date().toLocaleString("th-TH");

  const summaryLines = [
    "So1o Freelancer — สรุปภาษีสำหรับนักบัญชี",
    "================================================",
    `สร้างเมื่อ: ${generated}`,
    `ปีภาษี: ${year}`,
    brandName ? `ผู้ประกอบการ: ${brandName}` : "",
    "",
    "--- สรุปรายได้ ---",
    `รายได้รวม (Gross): ${formatTHB(est.totalGross)} บาท`,
    `หัก ณ ที่จ่ายสะสม: ${formatTHB(est.totalWithheld)} บาท`,
    `จำนวนรายการรายได้: ${incomes.length} รายการ`,
    "",
    "--- ค่าใช้จ่าย ---",
    `วิธีหัก: ${expenseMethod === "lumpsum" ? "เหมาตามกฎหมาย" : "หักจริงจากบิล"}`,
    `ค่าใช้จ่ายที่หักได้: ${formatTHB(est.expenseDeduction)} บาท`,
    "",
    "--- ประมาณการภาษี (อ้างอิง) ---",
    `เงินได้สุทธิ: ${formatTHB(est.netIncome)} บาท`,
    `ภาษีประมาณการ: ${formatTHB(est.estimatedTax)} บาท`,
    `เครดิต WHT ที่หักแล้ว: ${formatTHB(est.totalWithheld)} บาท`,
    est.diff >= 0
      ? `ต้องจ่ายเพิ่ม (ประมาณ): ${formatTHB(est.diff)} บาท`
      : `ขอคืนได้ (ประมาณ): ${formatTHB(Math.abs(est.diff))} บาท`,
    "",
    "--- หมายเหตุ ---",
    "• ไฟล์นี้เป็นค่าประมาณการจาก So1o — ไม่ใช่คำแนะนำทางกฎหมาย",
    "• แนบไฟล์ income-detail CSV และใบ 50ทวิ (ถ้ามี) ให้นักบัญชีตรวจสอบ",
    "• ยื่น ภงด.90/91 ตามกำหนดของกรมสรรพากร",
    "",
  ].filter(Boolean);

  downloadText(summaryLines.join("\n"), `so1o-tax-summary-${year}.txt`);

  const headers = [
    "เดือน",
    "ลูกค้า",
    "ประเภท",
    "ยอด Gross",
    "อัตรา WHT",
    "หัก ณ ที่จ่าย",
    "เลขใบ 50ทวิ",
    "ได้รับใบ",
  ];
  const rows = incomes.map((i) => [
    i.month,
    i.client,
    i.incomeType ?? "freelance",
    i.gross,
    `${i.whtRate ?? 3}%`,
    i.withholding.toFixed(2),
    i.certificateNo ?? "",
    i.certificateReceived ? "Y" : "N",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }),
    `so1o-income-detail-${year}.csv`,
  );

  toast.success("ดาวน์โหลดสรุปภาษี + CSV รายได้แล้ว — ส่งให้นักบัญชีได้เลย");
}

function downloadText(content: string, filename: string) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

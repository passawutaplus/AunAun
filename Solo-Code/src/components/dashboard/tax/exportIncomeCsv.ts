import { toast } from "sonner";
import { escapeCSV } from "@/lib/security";
import type { IncomeRecord } from "@/data/mockData";

export function exportIncomeCsv(incomes: IncomeRecord[]) {
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
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `income-summary-${new Date().getFullYear()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("ดาวน์โหลด CSV รายได้เรียบร้อย");
}

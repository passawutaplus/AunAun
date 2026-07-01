import { escapeCSV } from "@/lib/security";
import { formatTHB } from "@/data/mockData";
import type { ExpenseRecord, IncomeRecord } from "@/data/mockData";
import type { TaxEstimate } from "./taxMath";
import { buildZipBlob, type ZipEntry } from "@/lib/docZip";
import { supabase } from "@/integrations/supabase/client";
import { whtStorageBucket } from "@/lib/whtScanAsset";

export type AccountantPreflight = {
  incomeCount: number;
  whtEligible: number;
  whtWithFile: number;
  whtMissing: IncomeRecord[];
  expenseCount: number;
  expenseWithReceipt: number;
  expenseMissingReceipt: number;
};

export function buildTaxSummaryText(opts: {
  year: number;
  incomes: IncomeRecord[];
  est: TaxEstimate;
  expenseMethod: "lumpsum" | "actual";
  brandName?: string;
}): string {
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

  return summaryLines.join("\n");
}

export function buildIncomeCsvContent(incomes: IncomeRecord[]): string {
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
  return [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
}

export function computeAccountantPreflight(
  incomes: IncomeRecord[],
  workExpenses: ExpenseRecord[],
): AccountantPreflight {
  const whtEligible = incomes.filter((i) => (i.withholding ?? 0) > 0);
  const whtWithFile = whtEligible.filter((i) => !!i.certificateStoragePath);
  const whtMissing = whtEligible.filter((i) => !i.certificateStoragePath);
  const expenseWithReceipt = workExpenses.filter((e) => !!e.receiptPath).length;

  return {
    incomeCount: incomes.length,
    whtEligible: whtEligible.length,
    whtWithFile: whtWithFile.length,
    whtMissing,
    expenseCount: workExpenses.length,
    expenseWithReceipt,
    expenseMissingReceipt: workExpenses.length - expenseWithReceipt,
  };
}

function whtFileName(income: IncomeRecord): string {
  const client = income.client.replace(/[^\w\u0E00-\u0E7F.-]+/g, "_").slice(0, 40);
  const cert = income.certificateNo ? `-${income.certificateNo}` : "";
  const ext = income.certificateStoragePath?.split(".").pop() ?? "pdf";
  return `${income.month}-${client}${cert}.${ext}`;
}

async function downloadStorageFile(bucket: string, path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw error ?? new Error(`ดาวน์โหลดไม่สำเร็จ: ${path}`);
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

export type AccountantPackItem = {
  id: string;
  label: string;
  zipPath: string;
  included: boolean;
  kind: "readme" | "csv" | "wht" | "expense" | "extra";
};

export function defaultPackItems(
  incomes: IncomeRecord[],
  workExpenses: ExpenseRecord[],
): AccountantPackItem[] {
  const items: AccountantPackItem[] = [
    { id: "readme", label: "สรุปภาษี (README)", zipPath: "00-README.txt", included: true, kind: "readme" },
    { id: "csv", label: "รายละเอียดรายได้ (CSV)", zipPath: "01-income-detail.csv", included: true, kind: "csv" },
  ];

  for (const i of incomes) {
    if (!i.certificateStoragePath) continue;
    items.push({
      id: `wht-${i.id}`,
      label: `50ทวิ — ${i.client} (${i.month})`,
      zipPath: `50twi/${whtFileName(i)}`,
      included: true,
      kind: "wht",
    });
  }

  for (const e of workExpenses) {
    if (!e.receiptPath) continue;
    const safe = e.description.replace(/[^\w\u0E00-\u0E7F.-]+/g, "_").slice(0, 30);
    const ext = e.receiptPath.split(".").pop() ?? "jpg";
    items.push({
      id: `exp-${e.id}`,
      label: `ใบเสร็จ — ${e.description}`,
      zipPath: `expenses/${e.date}-${safe}.${ext}`,
      included: true,
      kind: "expense",
    });
  }

  return items;
}

export async function buildAccountantPackZip(opts: {
  year: number;
  incomes: IncomeRecord[];
  workExpenses: ExpenseRecord[];
  est: TaxEstimate;
  expenseMethod: "lumpsum" | "actual";
  brandName?: string;
  extraFiles?: File[];
  items?: AccountantPackItem[];
  mergeWhtIntoSinglePdf?: boolean;
}): Promise<Blob> {
  const {
    year,
    incomes,
    workExpenses,
    est,
    expenseMethod,
    brandName,
    extraFiles = [],
    items = defaultPackItems(incomes, workExpenses),
    mergeWhtIntoSinglePdf = false,
  } = opts;

  const entries: ZipEntry[] = [];
  const root = `so1o-tax-${year}`;

  const include = (id: string) => items.find((x) => x.id === id)?.included !== false;

  if (include("readme")) {
    entries.push({
      path: `${root}/00-README.txt`,
      data: buildTaxSummaryText({ year, incomes, est, expenseMethod, brandName }),
    });
  }

  if (include("csv")) {
    entries.push({
      path: `${root}/01-income-detail.csv`,
      data: `\uFEFF${buildIncomeCsvContent(incomes)}`,
    });
  }

  const whtItems = items.filter((x) => x.kind === "wht" && x.included);
  const whtBytesList: Uint8Array[] = [];

  for (const item of whtItems) {
    const income = incomes.find((i) => item.id === `wht-${i.id}`);
    if (!income?.certificateStoragePath) continue;
    const bytes = await downloadStorageFile(whtStorageBucket(), income.certificateStoragePath);
    if (mergeWhtIntoSinglePdf) {
      whtBytesList.push(bytes);
    } else {
      entries.push({ path: `${root}/${item.zipPath}`, data: bytes });
    }
  }

  if (mergeWhtIntoSinglePdf && whtBytesList.length > 0) {
    const { mergePdfBytes } = await import("@/lib/docPdf");
    const merged = await mergePdfBytes(whtBytesList);
    entries.push({ path: `${root}/50twi/50twi-merged-${year}.pdf`, data: merged });
  }

  for (const item of items.filter((x) => x.kind === "expense" && x.included)) {
    const exp = workExpenses.find((e) => item.id === `exp-${e.id}`);
    if (!exp?.receiptPath) continue;
    const bytes = await downloadStorageFile("expense-receipts", exp.receiptPath);
    entries.push({ path: `${root}/${item.zipPath}`, data: bytes });
  }

  for (let i = 0; i < extraFiles.length; i++) {
    const f = extraFiles[i];
    entries.push({
      path: `${root}/extras/${f.name}`,
      data: f,
    });
  }

  return buildZipBlob(entries);
}

export function buildAccountantLineMessage(opts: {
  year: number;
  brandName?: string;
  preflight: AccountantPreflight;
  fileList: string[];
}): string {
  const { year, brandName, preflight, fileList } = opts;
  const name = brandName ?? "ฟรีแลนซ์";
  const lines = [
    `สวัสดีครับ/ค่ะ — ${name} ส่งชุดเอกสารภาษีปี ${year} ครับ/ค่ะ`,
    "",
    "ไฟล์ในชุด:",
    ...fileList.map((f) => `• ${f}`),
    "",
    `สรุป: รายได้ ${preflight.incomeCount} รายการ · 50ทวิ ${preflight.whtWithFile}/${preflight.whtEligible} ใบ`,
    preflight.whtMissing.length > 0
      ? `(ยังขาดไฟล์ 50ทวิ ${preflight.whtMissing.length} รายการ — จะส่งเพิ่มภายหลัง)`
      : "",
    "",
    "หมายเหตุ: ตัวเลขเป็นค่าประมาณการจาก So1o — กรุณาตรวจสอบก่อนยื่น ภงด.90/91",
    "",
    "ขอบคุณครับ/ค่ะ",
  ].filter(Boolean);
  return lines.join("\n");
}

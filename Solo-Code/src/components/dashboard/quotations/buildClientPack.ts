import { buildZipBlob, downloadBlob } from "@/lib/docZip";
import { computeTotals, formatBaht, type Quotation } from "@/store/quotations";

export function buildClientPackManifest(q: Quotation, opts: {
  includeBrief: boolean;
  includeTimeline: boolean;
  trackUrl?: string;
  hasQtPdf?: boolean;
}): string {
  const totals = computeTotals(q);
  const lines = [
    "So1o — ชุดส่งลูกค้า",
    "========================",
    `โครงการ: ${q.projectName || "—"}`,
    `ลูกค้า: ${q.clientName || "—"}`,
    `เลขที่: ${q.number || "—"}`,
    `ยอดรวม: ฿${formatBaht(totals.grandTotal)}`,
    "",
    "รายการในชุด:",
    opts.hasQtPdf ? "• ใบเสนอราคา PDF (quotation.pdf)" : "• ใบเสนอราคา (export PDF จาก So1o แยก)",
    opts.includeBrief && q.briefId ? "• Smart Brief" : null,
    opts.includeTimeline ? "• Timeline ภาคผนวก" : null,
    opts.trackUrl ? `• ติดตามงาน: ${opts.trackUrl}` : null,
    "",
    "หมายเหตุ: ไฟล์ต้นฉบับ (.ai/.psd) แนบใน ZIP ถ้ามี",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function buildClientPackZip(opts: {
  q: Quotation;
  includeBrief: boolean;
  includeTimeline: boolean;
  trackUrl?: string;
  extraFiles: File[];
  attachedPdf?: Blob | null;
}): Promise<Blob> {
  const { q, includeBrief, includeTimeline, trackUrl, extraFiles, attachedPdf } = opts;
  const root = `so1o-client-${q.number || q.id.slice(0, 8)}`;
  const entries: { path: string; data: Blob | string }[] = [
    {
      path: `${root}/00-README.txt`,
      data: buildClientPackManifest(q, { includeBrief, includeTimeline, trackUrl, hasQtPdf: !!attachedPdf }),
    },
  ];

  if (attachedPdf) {
    entries.push({
      path: `${root}/quotation.pdf`,
      data: attachedPdf,
    });
  }

  for (const f of extraFiles) {
    entries.push({ path: `${root}/files/${f.name}`, data: f });
  }

  return buildZipBlob(entries);
}

export function buildClientLineMessage(opts: {
  q: Quotation;
  trackUrl?: string;
  fileNames: string[];
}): string {
  const { q, trackUrl, fileNames } = opts;
  const title = q.projectName || "งาน";
  const lines = [
    `สวัสดีครับ/ค่ะ — แนบเอกสารงาน «${title}» ตามนี้ครับ/ค่ะ`,
    "",
    ...fileNames.map((f) => `• ${f}`),
    "",
    trackUrl ? `ติดตามสถานะงาน: ${trackUrl}` : null,
    "",
    "หากมีคำถามแจ้งได้เลยครับ/ค่ะ ขอบคุณครับ/ค่ะ",
  ].filter(Boolean);
  return lines.join("\n");
}

export { downloadBlob };

import type { DeliveryProjectType } from "@/lib/labs/types";

export const PROJECT_TYPES: { id: DeliveryProjectType; label: string }[] = [
  { id: "design", label: "ดีไซน์" },
  { id: "website", label: "เว็บไซต์" },
  { id: "video", label: "วิดีโอ" },
  { id: "document", label: "เอกสาร" },
  { id: "code", label: "โค้ด" },
  { id: "custom", label: "กำหนดเอง" },
];

export const DEFAULT_FOLDERS = [
  { id: "final", label: "01_Final" },
  { id: "source", label: "02_Source" },
  { id: "preview", label: "03_Preview" },
  { id: "documents", label: "04_Documents" },
] as const;

export const DELIVERY_CHECKLIST = [
  { id: "final", label: "ไฟล์ Final ครบ" },
  { id: "source", label: "ไฟล์ต้นฉบับ (ถ้ามีในสัญญา)" },
  { id: "preview", label: "ไฟล์ Preview / Mockup" },
  { id: "note", label: "บันทึกส่งมอบ (README)" },
  { id: "license", label: "หมายเหตุลิขสิทธิ์/การใช้งาน" },
] as const;

export function buildDeliveryReadme(opts: {
  projectName: string;
  clientName: string;
  projectType: DeliveryProjectType;
  fileNames: string[];
  customNote?: string;
}): string {
  const typeLabel = PROJECT_TYPES.find((t) => t.id === opts.projectType)?.label ?? "งาน";
  const lines = [
    "README — ชุดส่งมอบงาน",
    "========================",
    `โครงการ: ${opts.projectName || "—"}`,
    `ลูกค้า: ${opts.clientName || "—"}`,
    `ประเภท: ${typeLabel}`,
    "",
    "โครงสร้างโฟลเดอร์:",
    "• 01_Final — ไฟล์ส่งมอบฉบับสุดท้าย",
    "• 02_Source — ไฟล์ต้นฉบับ (ถ้ารวมในสัญญา)",
    "• 03_Preview — ตัวอย่าง / mockup",
    "• 04_Documents — เอกสารประกอบ",
    "",
    "รายการไฟล์:",
    ...opts.fileNames.map((f) => `• ${f}`),
    "",
    "หมายเหตุการใช้งาน:",
    opts.customNote?.trim() ||
      "ไฟล์นี้ส่งมอบตามขอบเขตในสัญญา/ใบเสนอราคา ห้ามนำไปใช้นอกขอบเขตโดยไม่ได้รับอนุญาต",
    "",
    "— สร้างด้วย Solo Labs Delivery Pack",
  ];
  return lines.join("\n");
}

export function buildClientDeliveryNote(opts: {
  projectName: string;
  clientName: string;
  fileCount: number;
}): string {
  const title = opts.projectName || "งาน";
  return [
    `สวัสดี${opts.clientName ? ` คุณ${opts.clientName}` : "ครับ/ค่ะ"},`,
    "",
    `แนบชุดส่งมอบงาน «${title}» จำนวน ${opts.fileCount} ไฟล์ ตามโครงสร้างใน ZIP`,
    "",
    "กรุณาตรวจสอบไฟล์ในโฟลเดอร์ 01_Final และอ่าน README_FOR_CLIENT.txt",
    "",
    "หากมีข้อสงสัยหรือต้องการแก้ไข แจ้งกลับได้เลยครับ/ค่ะ",
    "",
    "ขอบคุณครับ/ค่ะ",
  ].join("\n");
}

import type { Quotation } from "@/store/quotations";

export type ClientPackPreflight = {
  ok: boolean;
  items: { id: string; label: string; ok: boolean; hint?: string }[];
};

export function computeClientPackPreflight(opts: {
  q: Quotation;
  extraFiles: File[];
  trackUrl?: string;
  includeQtPdf: boolean;
  hasQtPdf: boolean;
}): ClientPackPreflight {
  const { q, extraFiles, trackUrl, includeQtPdf, hasQtPdf } = opts;
  const items = [
    {
      id: "qt",
      label: "ใบเสนอราคา PDF",
      ok: !includeQtPdf || hasQtPdf,
      hint: includeQtPdf ? undefined : "เปิดรวมใน ZIP หรือ export แยก",
    },
    {
      id: "files",
      label: "ไฟล์แนบ",
      ok: extraFiles.length > 0,
      hint: "เพิ่ม mockup / source หรือส่งจาก Doc Lab",
    },
    {
      id: "track",
      label: "ลิงก์ติดตามงาน",
      ok: !!trackUrl || q.status === "draft",
      hint: "สร้างลิงก์ติดตามจากใบเสนอราคา",
    },
    {
      id: "client",
      label: "ชื่อลูกค้า",
      ok: !!q.clientName?.trim(),
    },
    {
      id: "project",
      label: "ชื่อโปรเจกต์",
      ok: !!q.projectName?.trim(),
    },
  ];
  return { ok: items.every((x) => x.ok), items };
}

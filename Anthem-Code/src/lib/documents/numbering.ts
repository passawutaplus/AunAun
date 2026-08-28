import { sharedDb } from "@/integrations/supabase/db";
import type { HireDocumentKind } from "@/lib/payments/types";

export type DocNumberKind = HireDocumentKind | "hire_order";

const PREFIX: Record<DocNumberKind, string> = {
  quotation: "QT",
  invoice: "INV",
  receipt: "RCP",
  platform_fee_receipt: "FEE",
  wht_cert: "WHT",
  hire_order: "ORD",
};

const SEQUENTIAL_DOC_NUMBER = /^(QT|INV|RCP|FEE|WHT|ORD)-\d{4}-\d{4}$/;

export function docNumberYear(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "year")?.value) || now.getFullYear();
}

export function isSequentialDocNumber(value: string | null | undefined): boolean {
  return !!value && SEQUENTIAL_DOC_NUMBER.test(value.trim());
}

/** Client-side fallback when RPC is unavailable. Not a running series. */
export function makeProvisionalDocNumber(kind: DocNumberKind, now = new Date()): string {
  const y = docNumberYear(now);
  const n = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
  return `${PREFIX[kind]}-${y}-${n}`;
}

/** Stable mock numbers so the document pack does not jump on re-render. */
export function makeStableMockDocNumber(
  kind: DocNumberKind,
  seed: string,
  now = new Date(),
): string {
  const y = docNumberYear(now);
  const src = `${kind}:${seed}`;
  let h = 0;
  for (let i = 0; i < src.length; i += 1) {
    h = (h * 31 + src.charCodeAt(i)) >>> 0;
  }
  const n = (h % 9000) + 1;
  return `${PREFIX[kind]}-${y}-${String(n).padStart(4, "0")}`;
}

export function displayOrderCode(
  id: string | null | undefined,
  orderCode?: string | null,
): string {
  const sequential = orderCode?.trim();
  if (sequential) return sequential;
  if (!id) return "—";
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function orderCodeFromMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const code = (metadata as { order_code?: unknown }).order_code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

/**
 * Allocate the next QT/INV/RCP/FEE/WHT/ORD number from `shared.next_doc_number`.
 * Call only when persisting — not when a dialog opens.
 */
export async function allocateDocNumber(kind: DocNumberKind): Promise<string> {
  const { data, error } = await sharedDb.rpc("next_doc_number" as never, {
    p_kind: kind,
  } as never);
  if (!error && typeof data === "string" && isSequentialDocNumber(data)) {
    return data.trim();
  }
  return makeProvisionalDocNumber(kind);
}

export function docKindLabelTh(kind: HireDocumentKind): string {
  switch (kind) {
    case "quotation":
      return "ใบเสนอราคา";
    case "invoice":
      return "ใบแจ้งหนี้";
    case "receipt":
      return "ใบเสร็จรับเงิน";
    case "platform_fee_receipt":
      return "ใบเสร็จค่าธรรมเนียมแพลตฟอร์ม";
    case "wht_cert":
      return "หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)";
    default:
      return kind;
  }
}

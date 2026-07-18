/** Human-readable preview for Aplus1 chat protocol blobs (notifications / email). */

function extractJsonStringField(content: string, key: string): string | null {
  const m = content.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return m?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, "\n") ?? null;
}

function extractJsonNumberField(content: string, key: string): number | null {
  const m = content.match(new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function chatProtocolPreviewText(content: string | null | undefined): string | null {
  if (!content?.includes("__APLUS1_")) return null;

  if (content.includes("__APLUS1_OFFER__")) {
    const title = extractJsonStringField(content, "title");
    const amount = extractJsonNumberField(content, "amount");
    if (title && amount != null) return `ส่งข้อเสนอราคา «${title}» · ${formatBaht(amount)}`;
    if (title) return `ส่งข้อเสนอราคา «${title}»`;
    return "ส่งข้อเสนอราคา";
  }

  if (content.includes("__APLUS1_HIRE_REJECT_CHOICE__")) {
    const reason = extractJsonStringField(content, "reasonLabel") || "ปฏิเสธคำขอจ้าง";
    const note = extractJsonStringField(content, "note");
    if (note) return `ปฏิเสธคำขอจ้าง · ${reason} — ${note}`;
    return `ปฏิเสธคำขอจ้าง · ${reason}`;
  }

  if (content.includes("__APLUS1_HIRE_CONTINUE_ASK__")) return "ขอคุยรายละเอียดเพิ่มเติม";
  if (content.includes("__APLUS1_HIRE_FORWARD__")) {
    const toName = extractJsonStringField(content, "toName");
    return toName ? `ส่งต่องานให้ ${toName}` : "ส่งต่องาน";
  }
  if (content.includes("__APLUS1_HIRE_CANCEL__")) return "คำขอยกเลิกงาน";
  if (content.includes("__APLUS1_HIRE_DELIVERY__")) return "ส่งมอบผลงาน";
  return "ข้อความในแชท";
}

export function chatMessagePreview(content: string | null | undefined): string {
  const raw = (content ?? "").trim();
  const protocol = chatProtocolPreviewText(raw);
  if (protocol) return protocol;
  if (!raw) return "(ไฟล์แนบ)";
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}

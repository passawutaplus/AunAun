/** Structured hire-reject follow-up messages in chat. */

export type HirePostRejectChat =
  | "awaiting_client"
  | "awaiting_freelancer"
  | "open"
  | "locked";

export const HIRE_REJECT_CHOICE_PREFIX = "__APLUS1_HIRE_REJECT_CHOICE__:";
export const HIRE_CONTINUE_ASK_PREFIX = "__APLUS1_HIRE_CONTINUE_ASK__:";

export const HIRE_CLIENT_ACCEPT_REJECT_TEXT =
  "เข้าใจครับ/ค่ะ ไว้โอกาสหน้าร่วมงานกันครับ/ค่ะ";
/** Legacy close text — still treated as chat-locked in history. */
export const HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY = "ได้ครับ ไว้โอกาสหน้าร่วมงานกันครับ";
export const HIRE_CLIENT_ASK_CONTINUE_TEXT = "งั้นขอคุยรายละเอียดเพิ่มเติมก่อนได้มั้ย";
export const HIRE_FREELANCER_ACCEPT_CONTINUE_TEXT =
  "ได้ครับ ยังไม่รับงานนี้ แต่คุยรายละเอียดต่อได้เลยครับ";
export const HIRE_FREELANCER_DECLINE_CONTINUE_TEXT =
  "ขออภัยครับ/ค่ะ ยังไม่สะดวกคุยต่อในแชทนี้ — ทักจากหน้าผลงานใหม่ได้ถ้าสนใจอีกครั้ง";

export type HireRejectChoicePayload = {
  v: 1;
  kind: "reject_choice";
  requestId: string;
  reasonId: string;
  reasonLabel: string;
  note?: string | null;
};

export type HireContinueAskPayload = {
  v: 1;
  kind: "continue_ask";
  requestId: string;
};

export function encodeHireRejectChoiceMessage(payload: HireRejectChoicePayload): string {
  return `${HIRE_REJECT_CHOICE_PREFIX}${JSON.stringify({ ...payload, v: 1, kind: "reject_choice" })}`;
}

function extractJsonObject(afterMarker: string): string | null {
  const cleaned = afterMarker.replace(/^[\s:\u200b\uFEFF]*/, "");
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

export function parseHireRejectChoiceMessage(
  content: string | null | undefined,
): HireRejectChoicePayload | null {
  if (!content) return null;
  const trimmed = content.trim();
  const marker = "__APLUS1_HIRE_REJECT_CHOICE__";
  const idx = trimmed.indexOf(marker);
  if (idx < 0) return null;
  const after = trimmed.slice(idx + marker.length);
  const jsonText = extractJsonObject(after) ?? after.replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const raw = JSON.parse(jsonText) as HireRejectChoicePayload;
    if (!raw?.requestId) return null;
    return {
      ...raw,
      v: 1,
      kind: "reject_choice",
      reasonId: raw.reasonId || "other",
      reasonLabel: raw.reasonLabel || "ปฏิเสธคำขอจ้าง",
    };
  } catch {
    // Last resort: surface reasonLabel from a broken payload so UI never shows the protocol blob.
    const label =
      after.match(/"reasonLabel"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1]
        ?.replace(/\\"/g, '"')
        ?.replace(/\\n/g, "\n") || "ปฏิเสธคำขอจ้าง";
    const requestId =
      after.match(/"requestId"\s*:\s*"([^"]+)"/)?.[1] || "unknown";
    return {
      v: 1,
      kind: "reject_choice",
      requestId,
      reasonId: "other",
      reasonLabel: label,
      note: null,
    };
  }
}

export function encodeHireContinueAskMessage(payload: HireContinueAskPayload): string {
  return `${HIRE_CONTINUE_ASK_PREFIX}${JSON.stringify({ ...payload, v: 1, kind: "continue_ask" })}`;
}

export function parseHireContinueAskMessage(
  content: string | null | undefined,
): HireContinueAskPayload | null {
  if (!content) return null;
  const trimmed = content.trim();
  const marker = "__APLUS1_HIRE_CONTINUE_ASK__";
  const idx = trimmed.indexOf(marker);
  if (idx < 0) return null;
  const after = trimmed.slice(idx + marker.length);
  const jsonText = extractJsonObject(after) ?? after.replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const raw = JSON.parse(jsonText) as HireContinueAskPayload;
    if (!raw?.requestId) {
      const requestId = after.match(/"requestId"\s*:\s*"([^"]+)"/)?.[1];
      if (!requestId) return null;
      return { v: 1, kind: "continue_ask", requestId };
    }
    return { ...raw, v: 1, kind: "continue_ask" };
  } catch {
    const requestId = after.match(/"requestId"\s*:\s*"([^"]+)"/)?.[1];
    if (!requestId) return null;
    return { v: 1, kind: "continue_ask", requestId };
  }
}

export function isHireProtocolMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  return (
    content.includes("__APLUS1_HIRE_REJECT_CHOICE__") ||
    content.includes("__APLUS1_HIRE_CONTINUE_ASK__") ||
    content.includes("__APLUS1_HIRE_FORWARD__") ||
    content.includes("__APLUS1_HIRE_CANCEL__") ||
    content.includes("__APLUS1_HIRE_DELIVERY__") ||
    content.includes("__APLUS1_HIRE_PAID__") ||
    content.includes("__APLUS1_HIRE_WORK_START__") ||
    content.includes("__APLUS1_HIRE_RECEIPT__") ||
    content.includes("__APLUS1_OFFER__")
  );
}

/** Permanently closed after round-2 reject (decline continue / client accepts close). */
export function isHireChatComposerLocked(postRejectChat: string | null | undefined): boolean {
  return postRejectChat === "locked";
}

/** Fallback when DB state is stale — detect round-2 close messages already in the thread. */
export function hireChatLockedByMessages(
  messages: Array<{ content?: string | null }> | null | undefined,
): boolean {
  if (!messages?.length) return false;
  return messages.some((m) => {
    const c = m.content?.trim() ?? "";
    return (
      c === HIRE_FREELANCER_DECLINE_CONTINUE_TEXT ||
      c === HIRE_CLIENT_ACCEPT_REJECT_TEXT ||
      c === HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY
    );
  });
}

export const HIRE_CHAT_LOCKED_HINT =
  "แชทนี้ปิดแล้วหลังปฏิเสธครบ 2 รอบ — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้ ทักจากหน้าผลงานถ้าสนใจอีกครั้ง";

/** Short label for conversation list / badges. */
export const HIRE_CHAT_LOCKED_LIST_LABEL = "แชทปิดแล้ว";

export function hireChatLockHint(postRejectChat: string | null | undefined): string | null {
  if (postRejectChat === "locked") return HIRE_CHAT_LOCKED_HINT;
  return null;
}

/** Hire cancel-request flow (หลังข้อเสนอยืนยัน) — reasons, money terms, timers, chat protocol. */

export const HIRE_CANCEL_EDIT_MS = 24 * 60 * 60 * 1000;
export const HIRE_CANCEL_RESPOND_MS = 48 * 60 * 60 * 1000;

export type HireCancelInitiatedBy = "client" | "freelancer";

export type HireCancelStatus =
  | "pending"
  | "withdrawn"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "countered";

export type HireCancelMoneyTerms =
  | "none"
  | "full_refund"
  | "half_refund"
  | "no_refund"
  | "compensation_50";

export type HireCancelEventType =
  | "submitted"
  | "edited"
  | "withdrawn"
  | "accepted"
  | "rejected"
  | "countered"
  | "auto_approved"
  | "compensation_requested";

export type HireCancelRequestRow = {
  id: string;
  hiring_request_id: string;
  conversation_id: string | null;
  initiated_by: HireCancelInitiatedBy;
  initiator_id: string;
  status: HireCancelStatus;
  money_terms: HireCancelMoneyTerms;
  reason_id: string | null;
  reason_note: string | null;
  evidence_urls: string[] | null;
  response_money_terms: HireCancelMoneyTerms | null;
  response_reason_id: string | null;
  response_note: string | null;
  responder_id: string | null;
  responded_at: string | null;
  first_submitted_at: string;
  last_edited_at: string | null;
  respond_deadline_at: string;
  edit_until_at: string;
  created_at: string;
  updated_at: string;
};

export type HireCancelEventRow = {
  id: string;
  cancel_request_id: string;
  actor_id: string | null;
  event_type: HireCancelEventType;
  snapshot: Record<string, unknown>;
  diff_summary: string | null;
  created_at: string;
};

/** ผู้จ้างขอยกเลิก */
export const HIRE_CANCEL_CLIENT_REASONS = [
  { id: "changed_mind", label: "เปลี่ยนใจ / ไม่ต้องการแล้ว" },
  { id: "budget_cut", label: "งบหรือแผนโปรเจกต์เปลี่ยน" },
  { id: "timeline_change", label: "ไทม์ไลน์ไม่ตรงแล้ว" },
  { id: "scope_unclear", label: "ขอบเขตงานยังไม่ชัด / อยากเริ่มใหม่" },
  { id: "found_other", label: "มีทางเลือกอื่นแล้ว" },
  { id: "no_response", label: "ติดต่อฟรีแลนซ์ไม่ได้ตามที่ตกลง" },
  { id: "quality_concern", label: "ผลงานระหว่างทางยังไม่ตรงโจทย์" },
  { id: "other", label: "อื่นๆ" },
] as const;

/** ฟรีแลนซ์ขอยกเลิก */
export const HIRE_CANCEL_FREELANCER_REASONS = [
  { id: "unavailable", label: "มีเหตุจำเป็นส่วนตัว ทำให้ทำต่อไม่ไหว" },
  { id: "capacity", label: "คิวหรือภาระงานเปลี่ยน รับต่อไม่ไหว" },
  { id: "scope_changed", label: "ขอบเขตงานเปลี่ยนจากที่ตกลง จนทำต่อไม่ได้" },
  { id: "brief_blocked", label: "ข้อมูล/RAW จากผู้จ้างไม่ครบจนทำงานต่อไม่ได้" },
  { id: "collaboration_fit", label: "สไตล์การทำงานหรือการสื่อสารไม่ตรงกัน ขอถอนตัว" },
  { id: "force_majeure", label: "เหตุสุดวิสัยนอกเหนือควบคุม" },
  { id: "other", label: "อื่นๆ" },
] as const;

/** อีกฝ่ายปฏิเสธการยกเลิก */
export const HIRE_CANCEL_REJECT_REASONS = [
  { id: "need_delivery", label: "ยังต้องการงานตามที่ตกลง" },
  { id: "near_deadline", label: "ใกล้กำหนดส่ง ขอยกเลิกตอนนี้กระทบแผน" },
  { id: "already_paid", label: "จ่ายมัดจำ/ชำระแล้ว ขอคุยเงื่อนไขเงินก่อน" },
  { id: "want_full_refund", label: "ยอมเลิกได้ แต่ขอคืนเต็ม ไม่ใช่ 50%" },
  { id: "work_usable", label: "มีงานบางส่วนที่ใช้ต่อได้ ขอคุยมอบมอบก่อนเลิก" },
  { id: "other", label: "อื่นๆ" },
] as const;

export type HireCancelClientReasonId = (typeof HIRE_CANCEL_CLIENT_REASONS)[number]["id"];
export type HireCancelFreelancerReasonId = (typeof HIRE_CANCEL_FREELANCER_REASONS)[number]["id"];
export type HireCancelRejectReasonId = (typeof HIRE_CANCEL_REJECT_REASONS)[number]["id"];

export const HIRE_CANCEL_MONEY_OPTIONS: {
  id: HireCancelMoneyTerms;
  label: string;
  hint?: string;
}[] = [
  { id: "full_refund", label: "คืนเต็มจำนวน", hint: "เมื่อชำระผ่าน Aplus1 แล้ว ระบบจะสร้าง refund ตาม ledger/Omise" },
  { id: "half_refund", label: "คืน 50%", hint: "เมื่อชำระผ่าน Aplus1 แล้ว ระบบจะคืนครึ่งและปรับ ledger" },
  { id: "no_refund", label: "ไม่คืนเงิน", hint: "ใช้เมื่อตกลงกันแล้วว่าไม่คืน — ปรับสถานะออเดอร์ตามนั้น" },
  { id: "none", label: "ยังไม่ระบุเงื่อนไขเงิน", hint: "เหมาะเมื่อผู้จ้างขอยกเลิกและยังไม่คุยเงิน" },
];

export function hireCancelReasonLabel(
  id: string | null | undefined,
  role: "client" | "freelancer" | "reject" = "client",
): string {
  if (!id) return "";
  if (role === "freelancer") {
    return HIRE_CANCEL_FREELANCER_REASONS.find((r) => r.id === id)?.label ?? id;
  }
  if (role === "reject") {
    return HIRE_CANCEL_REJECT_REASONS.find((r) => r.id === id)?.label ?? id;
  }
  return HIRE_CANCEL_CLIENT_REASONS.find((r) => r.id === id)?.label ?? id;
}

export function hireCancelMoneyLabel(terms: HireCancelMoneyTerms | null | undefined): string {
  switch (terms) {
    case "full_refund":
      return "คืนเต็มจำนวน";
    case "half_refund":
      return "คืน 50%";
    case "no_refund":
      return "ไม่คืนเงิน";
    case "compensation_50":
      return "ขอค่าชดเชย 50%";
    case "none":
      return "ยังไม่ระบุเงื่อนไขเงิน";
    default:
      return "—";
  }
}

export function isHireCancelOpenStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "countered";
}

export function isHireCancelApprovedStatus(status: string | null | undefined): boolean {
  return status === "approved" || status === "auto_approved";
}

export function canEditHireCancelRequest(
  row: Pick<HireCancelRequestRow, "status" | "edit_until_at" | "initiator_id">,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!userId || row.initiator_id !== userId) return false;
  if (row.status !== "pending") return false;
  return new Date(row.edit_until_at).getTime() > now;
}

export function canWithdrawHireCancelRequest(
  row: Pick<HireCancelRequestRow, "status" | "edit_until_at" | "initiator_id">,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  return canEditHireCancelRequest(row, userId, now);
}

export function canRespondToHireCancelRequest(
  row: Pick<HireCancelRequestRow, "status" | "initiator_id" | "respond_deadline_at">,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!userId) return false;
  if (!isHireCancelOpenStatus(row.status)) return false;
  if (new Date(row.respond_deadline_at).getTime() <= now) return false;
  // pending: the other party responds
  // countered: original initiator must accept/reject the counter offer
  if (row.status === "countered") {
    return row.initiator_id === userId;
  }
  return row.initiator_id !== userId;
}

export function buildCancelDeadlines(from = new Date()): {
  first_submitted_at: string;
  edit_until_at: string;
  respond_deadline_at: string;
} {
  const first = from.getTime();
  return {
    first_submitted_at: new Date(first).toISOString(),
    edit_until_at: new Date(first + HIRE_CANCEL_EDIT_MS).toISOString(),
    respond_deadline_at: new Date(first + HIRE_CANCEL_RESPOND_MS).toISOString(),
  };
}

export function formatRemaining(untilIso: string, now = Date.now()): string {
  const ms = new Date(untilIso).getTime() - now;
  if (ms <= 0) return "หมดเวลาแล้ว";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `อีก ${d} วัน ${rh} ชม.`;
  }
  if (h > 0) return `อีก ${h} ชม. ${m} นาที`;
  return `อีก ${Math.max(1, m)} นาที`;
}

export function defaultFreelancerMoneyTerms(reasonId: string): HireCancelMoneyTerms {
  if (reasonId === "unavailable" || reasonId === "force_majeure" || reasonId === "capacity") {
    return "full_refund";
  }
  if (
    reasonId === "scope_changed" ||
    reasonId === "brief_blocked" ||
    reasonId === "collaboration_fit"
  ) {
    return "half_refund";
  }
  return "full_refund";
}

export function summarizeCancelDiff(
  before: { reason_id?: string | null; money_terms?: string | null; reason_note?: string | null },
  after: { reason_id?: string | null; money_terms?: string | null; reason_note?: string | null },
): string {
  const parts: string[] = [];
  if (before.money_terms !== after.money_terms) {
    parts.push(
      `เงื่อนไขเงิน: ${hireCancelMoneyLabel(before.money_terms as HireCancelMoneyTerms)} → ${hireCancelMoneyLabel(after.money_terms as HireCancelMoneyTerms)}`,
    );
  }
  if (before.reason_id !== after.reason_id) {
    parts.push("เปลี่ยนเหตุผล");
  }
  if ((before.reason_note || "") !== (after.reason_note || "")) {
    parts.push("แก้รายละเอียด");
  }
  return parts.length ? parts.join(" · ") : "แก้ไขคำขอยกเลิก";
}

export function hireCancelStatusLabel(status: HireCancelStatus | string | null | undefined): string {
  switch (status) {
    case "pending":
      return "รอพิจารณา";
    case "countered":
      return "รอตอบเงื่อนไข";
    case "withdrawn":
      return "ถอนคำขอแล้ว";
    case "approved":
      return "อนุมัติยกเลิกแล้ว";
    case "auto_approved":
      return "ยกเลิกอัตโนมัติ";
    case "rejected":
      return "ปฏิเสธการยกเลิก";
    default:
      return status || "—";
  }
}

export function hireCancelEventLabel(type: HireCancelEventType | string): string {
  switch (type) {
    case "submitted":
      return "ส่งคำขอยกเลิก";
    case "edited":
      return "แก้ไขคำขอ";
    case "withdrawn":
      return "ถอนคำขอ";
    case "accepted":
      return "ยอมรับยกเลิก";
    case "rejected":
      return "ปฏิเสธการยกเลิก";
    case "countered":
      return "เสนอเงื่อนไขเงินกลับ";
    case "auto_approved":
      return "อนุมัติอัตโนมัติ";
    case "compensation_requested":
      return "ขอค่าชดเชย 50%";
    default:
      return type;
  }
}

/* ---- Chat protocol card ---- */

export const HIRE_CANCEL_CARD_PREFIX = "__APLUS1_HIRE_CANCEL__:";

export type HireCancelCardPayload = {
  v: 1;
  kind: "hire_cancel";
  cancelRequestId: string;
  hiringRequestId: string;
};

export function encodeHireCancelCardMessage(payload: HireCancelCardPayload): string {
  return `${HIRE_CANCEL_CARD_PREFIX}${JSON.stringify({ ...payload, v: 1, kind: "hire_cancel" })}`;
}

export function parseHireCancelCardMessage(
  content: string | null | undefined,
): HireCancelCardPayload | null {
  if (!content) return null;
  const trimmed = content.trim();
  const marker = "__APLUS1_HIRE_CANCEL__";
  const idx = trimmed.indexOf(marker);
  if (idx < 0) return null;
  const after = trimmed.slice(idx + marker.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const start = after.indexOf("{");
    if (start < 0) return null;
    const raw = JSON.parse(after.slice(start)) as HireCancelCardPayload;
    if (!raw?.cancelRequestId || !raw?.hiringRequestId) return null;
    return { ...raw, v: 1, kind: "hire_cancel" };
  } catch {
    return null;
  }
}

export function isHireCancelCardContent(content: string | null | undefined): boolean {
  return !!content && content.includes("__APLUS1_HIRE_CANCEL__");
}

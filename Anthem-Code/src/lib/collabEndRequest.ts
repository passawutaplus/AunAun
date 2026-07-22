/** Collab end-request flow (หลังตอบรับ) — reasons, handoff terms, timers, chat protocol. */

import type { CollabPlanDocument } from "@/lib/collabPlanDoc";
import { COLLAB_PIPELINE } from "@/lib/collabPlanDoc";

export const COLLAB_END_EDIT_MS = 24 * 60 * 60 * 1000;
export const COLLAB_END_RESPOND_MS = 48 * 60 * 60 * 1000;

export type CollabEndStatus =
  | "pending"
  | "withdrawn"
  | "approved"
  | "rejected"
  | "auto_approved";

export type CollabEndTier = "early" | "active";

export type CollabEndHandoffTerms =
  | "return_all"
  | "keep_own"
  | "split_publish"
  | "joint_archive"
  | "discuss";

export type CollabEndCreditMode = "no_credit" | "credit_requested";

export type CollabEndCreditOutcome =
  | "grant_full"
  | "grant_partial"
  | "deny_credit"
  | "per_plan";

export type CollabEndEventType =
  | "submitted"
  | "edited"
  | "withdrawn"
  | "accepted"
  | "rejected"
  | "auto_approved";

export type CollabEndRequestRow = {
  id: string;
  collab_request_id: string;
  conversation_id: string;
  initiator_id: string;
  status: CollabEndStatus;
  tier: CollabEndTier;
  handoff_terms: CollabEndHandoffTerms;
  reason_id: string | null;
  reason_note: string | null;
  plan_step: string | null;
  credit_mode?: CollabEndCreditMode | null;
  credit_request_text?: string | null;
  portfolio_requested?: boolean | null;
  style_requested?: boolean | null;
  plan_rights_snapshot?: string | null;
  progress_count_initiator?: number | null;
  response_credit_outcome?: CollabEndCreditOutcome | null;
  response_credit_note?: string | null;
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

export type CollabEndEventRow = {
  id: string;
  end_request_id: string;
  actor_id: string | null;
  event_type: CollabEndEventType;
  snapshot: Record<string, unknown>;
  diff_summary: string | null;
  created_at: string;
};

export const COLLAB_END_REASONS = [
  { id: "direction_mismatch", label: "ทิศทางไม่ตรงกัน" },
  { id: "no_time", label: "ไม่มีเวลา / คิวเต็ม" },
  { id: "communication", label: "สื่อสารไม่ลงรอย" },
  { id: "scope_change", label: "ขอบเขตหรือแผนเปลี่ยน" },
  { id: "personal", label: "เหตุผลส่วนตัว" },
  { id: "other", label: "อื่นๆ" },
] as const;

export const COLLAB_END_REJECT_REASONS = [
  { id: "want_continue", label: "ยังอยากทำต่อ" },
  { id: "near_finish", label: "ใกล้จบแล้ว — ขอยุติตอนนี้ไม่สมเหตุสมผล" },
  { id: "handoff_unfair", label: "เงื่อนไขส่งมอบไม่โอเค" },
  { id: "other", label: "อื่นๆ" },
] as const;

/** ถอนตัว = สละสิทธิ์ทั้งหมด · ยุติทันที (credit_requested = legacy DB เท่านั้น) */
export type CollabEndSettlementPreset = "no_claim" | "credit_requested";

export const COLLAB_END_WITHDRAW_PRESET: CollabEndSettlementPreset = "no_claim";

export const COLLAB_END_SETTLEMENT_OPTIONS: {
  id: CollabEndSettlementPreset;
  handoff: CollabEndHandoffTerms;
  label: string;
  hint: string;
  defaultCreditMode: CollabEndCreditMode;
  instantExit: boolean;
}[] = [
  {
    id: "no_claim",
    handoff: "joint_archive",
    label: "สละสิทธิ์และเครดิตทั้งหมด",
    hint: "ถอนตัว = ไม่ claim งาน · อีกฝ่ายทำต่อได้ · ยุติทันที",
    defaultCreditMode: "no_credit",
    instantExit: true,
  },
  {
    id: "credit_requested",
    handoff: "split_publish",
    label: "ขอเครดิต/สิทธิ์ (legacy)",
    hint: "คำขอเก่า — รออีกฝ่ายยืนยัน",
    defaultCreditMode: "credit_requested",
    instantExit: false,
  },
];

/** คำเตือนใน modal ถอนตัว */
export const COLLAB_END_WITHDRAW_WARNING = {
  title: "ถอนตัว = สละสิทธิ์ทั้งหมด",
  body:
    "การถอนตัวถือว่าคุณยอมรับว่าไม่ claim งาน สิทธิ์ หรือเครดิตจากส่วนที่ทำร่วมกัน — อีกฝ่ายทำต่อได้ทันที · กดยืนยันแล้วตัดสิทธิ์ออกทันที",
  footnote: "อีกฝ่ายอาจให้เครดิตในภายหลังได้ตามดุลยพินิจ (ไม่ใช่สิทธิ์ที่คุณขอ)",
} as const;

export function handoffToSettlementPreset(
  handoff: CollabEndHandoffTerms,
  creditMode?: CollabEndCreditMode | string | null,
): CollabEndSettlementPreset {
  if (handoff === "split_publish" || creditMode === "credit_requested") return "credit_requested";
  return "no_claim";
}

export function settlementPresetToHandoff(preset: CollabEndSettlementPreset): CollabEndHandoffTerms {
  return COLLAB_END_SETTLEMENT_OPTIONS.find((o) => o.id === preset)?.handoff ?? "joint_archive";
}

export function settlementPresetInstantExit(preset: CollabEndSettlementPreset): boolean {
  return COLLAB_END_SETTLEMENT_OPTIONS.find((o) => o.id === preset)?.instantExit ?? false;
}

export function defaultCollabEndSettlement(_tier: CollabEndTier): CollabEndSettlementPreset {
  return COLLAB_END_WITHDRAW_PRESET;
}

export function settlementPresetDefaultCredit(preset: CollabEndSettlementPreset): CollabEndCreditMode {
  return (
    COLLAB_END_SETTLEMENT_OPTIONS.find((o) => o.id === preset)?.defaultCreditMode ?? "no_credit"
  );
}

/** เก็บไว้แสดงค่า handoff เก่าใน DB / การ์ด */
export const COLLAB_END_HANDOFF_OPTIONS: {
  id: CollabEndHandoffTerms;
  label: string;
  hint?: string;
  defaultCreditMode?: CollabEndCreditMode;
}[] = [
  {
    id: "return_all",
    label: "คืนไฟล์/WIP ให้อีกฝ่าย — ไม่ claim",
    hint: "ไม่ใช้งานต่อ · ไม่ขอเครดิต/สิทธิ์",
    defaultCreditMode: "no_credit",
  },
  {
    id: "keep_own",
    label: "แต่ละฝ่ายเก็บส่วนที่ตัวเองทำ",
    hint: "ไม่ publish ร่วม · โดยทั่วไปไม่ขอเครดิต/สิทธิ์",
    defaultCreditMode: "no_credit",
  },
  {
    id: "split_publish",
    label: "แยกลงพอร์ต + ขอเครดิต/สิทธิ์",
    hint: "ตามที่ทำไป — อีกฝ่ายตัดสินตอนยืนยันยุติ",
    defaultCreditMode: "credit_requested",
  },
  {
    id: "joint_archive",
    label: "เก็บเป็น draft ไม่เผยแพร่",
    hint: "ไม่ claim ร่วม · ไม่ขอเครดิต/สิทธิ์",
    defaultCreditMode: "no_credit",
  },
  {
    id: "discuss",
    label: "ยังไม่ตกลง — ขอคุยในแชทก่อน",
    hint: "ยืนยันคำขอยุติก่อน แล้วค่อยตกลงรายละเอียด",
    defaultCreditMode: "no_credit",
  },
];

/** handoff + credit จาก preset เดียว */
export function collabEndHandoffDefaultCredit(handoff: CollabEndHandoffTerms): CollabEndCreditMode {
  return (
    COLLAB_END_HANDOFF_OPTIONS.find((o) => o.id === handoff)?.defaultCreditMode ?? "no_credit"
  );
}

export function collabEndSettlementSummary(
  handoff: CollabEndHandoffTerms | null | undefined,
  creditMode: CollabEndCreditMode | string | null | undefined,
): string {
  if (!handoff) return "";
  const preset = handoffToSettlementPreset(handoff, creditMode);
  const opt = COLLAB_END_SETTLEMENT_OPTIONS.find((o) => o.id === preset);
  return opt?.label ?? collabEndHandoffLabel(handoff);
}

export const COLLAB_END_CREDIT_OUTCOMES: {
  id: CollabEndCreditOutcome;
  label: string;
  hint?: string;
}[] = [
  {
    id: "grant_full",
    label: "ให้เครดิต/สิทธิ์ตามที่ขอ",
    hint: "บันทึกเป็นหลักฐานตอนลงผลงาน",
  },
  {
    id: "grant_partial",
    label: "ให้บางส่วน",
    hint: "ระบุในหมายเหตุว่าให้อะไร",
  },
  {
    id: "per_plan",
    label: "ตามที่ตกลงในแผน",
    hint: "ใช้ข้อความสิทธิ์/เครดิตในแผน",
  },
  {
    id: "deny_credit",
    label: "ไม่ให้เครดิต/สิทธิ์",
    hint: "ยุติได้ แต่ไม่อนุญาต claim",
  },
];

/** ฝ่ายอยู่ต่อให้เครดิตสมัครใจหลังถอนตัว (ไม่มี deny) */
export const COLLAB_END_VOLUNTARY_CREDIT_OUTCOMES = COLLAB_END_CREDIT_OUTCOMES.filter(
  (o) => o.id !== "deny_credit",
);

export type CollabEndReasonId = (typeof COLLAB_END_REASONS)[number]["id"];
export type CollabEndRejectReasonId = (typeof COLLAB_END_REJECT_REASONS)[number]["id"];

export function collabEndReasonLabel(id: string | null | undefined): string {
  if (!id) return "";
  return COLLAB_END_REASONS.find((r) => r.id === id)?.label ?? id;
}

export function collabEndRejectReasonLabel(id: string | null | undefined): string {
  if (!id) return "";
  return COLLAB_END_REJECT_REASONS.find((r) => r.id === id)?.label ?? id;
}

export function collabEndHandoffLabel(terms: CollabEndHandoffTerms | null | undefined): string {
  if (!terms) return "";
  return COLLAB_END_HANDOFF_OPTIONS.find((o) => o.id === terms)?.label ?? terms;
}

export function collabEndCreditModeLabel(mode: CollabEndCreditMode | string | null | undefined): string {
  return mode === "credit_requested" ? "ขอเครดิต/สิทธิ์" : "ไม่ขอเครดิต/สิทธิ์";
}

export function collabEndCreditOutcomeLabel(
  outcome: CollabEndCreditOutcome | string | null | undefined,
): string {
  if (!outcome) return "";
  return COLLAB_END_CREDIT_OUTCOMES.find((o) => o.id === outcome)?.label ?? outcome;
}

/** Count progress boxes authored by user (create + review). */
export function countCollabProgressForUser(
  doc: CollabPlanDocument | null | undefined,
  userId: string | null | undefined,
): number {
  if (!doc || !userId) return 0;
  let n = 0;
  for (const step of ["create", "review"] as const) {
    for (const e of doc.payload[step].progressEntries ?? []) {
      if (e.userId === userId) n++;
    }
  }
  return n;
}

export function buildCollabEndCreditFields(
  doc: CollabPlanDocument | null | undefined,
  userId: string | null | undefined,
): {
  planRightsSnapshot: string | null;
  progressCount: number;
} {
  return {
    planRightsSnapshot: doc?.payload?.align?.rights?.trim() || null,
    progressCount: countCollabProgressForUser(doc, userId),
  };
}

export function creditRequestedSummary(row: Pick<
  CollabEndRequestRow,
  | "credit_mode"
  | "credit_request_text"
  | "portfolio_requested"
  | "style_requested"
  | "progress_count_initiator"
>): string | null {
  if (row.credit_mode !== "credit_requested") return null;
  const parts: string[] = [];
  if (row.credit_request_text?.trim()) parts.push(row.credit_request_text.trim());
  const flags: string[] = [];
  if (row.portfolio_requested) flags.push("ลงพอร์ต");
  if (row.style_requested) flags.push("อ้างสไตล์/แนวงาน");
  if (flags.length) parts.push(`(${flags.join(", ")})`);
  if (typeof row.progress_count_initiator === "number" && row.progress_count_initiator > 0) {
    parts.push(`progress ${row.progress_count_initiator} ชิ้น`);
  }
  return parts.length ? parts.join(" · ") : "ขอเครดิต/สิทธิ์ (ไม่ได้ระบุรายละเอียด)";
}

export function collabEndStatusLabel(status: CollabEndStatus | string | null | undefined): string {
  switch (status) {
    case "pending":
      return "รออีกฝ่ายยืนยัน";
    case "approved":
      return "ยุติคอลแลปแล้ว";
    case "auto_approved":
      return "ยุติอัตโนมัติ (หมดเวลา)";
    case "rejected":
      return "ปฏิเสธการยุติ";
    case "withdrawn":
      return "ถอนคำขอแล้ว";
    default:
      return status || "—";
  }
}

export function isCollabEndOpenStatus(status: string | null | undefined): boolean {
  return status === "pending";
}

export function isCollabEndInstantExit(
  row: Pick<
    CollabEndRequestRow,
    "status" | "credit_mode" | "handoff_terms" | "responder_id"
  >,
): boolean {
  return (
    isCollabEndApprovedStatus(row.status) &&
    row.credit_mode !== "credit_requested" &&
    row.handoff_terms === "joint_archive" &&
    !row.responder_id
  );
}

export function isCollabEndApprovedStatus(status: string | null | undefined): boolean {
  return status === "approved" || status === "auto_approved";
}

export function canEditCollabEndRequest(
  row: Pick<CollabEndRequestRow, "status" | "edit_until_at" | "initiator_id">,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!userId || row.initiator_id !== userId) return false;
  if (row.status !== "pending") return false;
  return new Date(row.edit_until_at).getTime() > now;
}

export function canWithdrawCollabEndRequest(
  row: Pick<CollabEndRequestRow, "status" | "edit_until_at" | "initiator_id">,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  return canEditCollabEndRequest(row, userId, now);
}

export function canRespondToCollabEndRequest(
  row: Pick<
    CollabEndRequestRow,
    "status" | "initiator_id" | "respond_deadline_at" | "credit_mode"
  >,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!userId) return false;
  if (!isCollabEndOpenStatus(row.status)) return false;
  if (row.credit_mode !== "credit_requested") return false;
  if (new Date(row.respond_deadline_at).getTime() <= now) return false;
  return row.initiator_id !== userId;
}

/** ฝ่ายอยู่ต่อให้เครดิตสมัครใจหลังถอนตัวแบบ instant */
export function canGrantVoluntaryCollabEndCredit(
  row: Pick<
    CollabEndRequestRow,
    | "status"
    | "initiator_id"
    | "response_credit_outcome"
    | "credit_mode"
    | "handoff_terms"
    | "responder_id"
  >,
  userId: string | null | undefined,
): boolean {
  if (!userId || row.initiator_id === userId) return false;
  if (!isCollabEndApprovedStatus(row.status)) return false;
  if (row.response_credit_outcome) return false;
  return isCollabEndInstantExit(row);
}

export function buildCollabEndDeadlines(from = new Date()): {
  first_submitted_at: string;
  edit_until_at: string;
  respond_deadline_at: string;
} {
  const first = from.getTime();
  return {
    first_submitted_at: new Date(first).toISOString(),
    edit_until_at: new Date(first + COLLAB_END_EDIT_MS).toISOString(),
    respond_deadline_at: new Date(first + COLLAB_END_RESPOND_MS).toISOString(),
  };
}

export function formatCollabEndRemaining(untilIso: string, now = Date.now()): string {
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

/** early = เพิ่งเริ่ม · active = มีแผน/ความคืบหน้าแล้ว (รวมใกล้จบ) */
export function detectCollabEndTier(
  doc: CollabPlanDocument | null | undefined,
  planPersisted: boolean,
): CollabEndTier {
  if (!planPersisted || !doc) return "early";

  if (doc.currentStep !== "align") return "active";
  if (doc.status === "step_locked") return "active";

  const align = doc.payload?.align;
  const hasContent = !!(
    align?.idea?.trim() ||
    align?.timelineNote?.trim() ||
    (align?.deliverableItems?.length ?? 0) > 0 ||
    (align?.portfolioRefs?.length ?? 0) > 0 ||
    (align?.referenceLinks?.length ?? 0) > 0
  );
  const hasProgress =
    (doc.payload?.create?.progressEntries?.length ?? 0) > 0 ||
    (doc.payload?.review?.progressEntries?.length ?? 0) > 0 ||
    (doc.payload?.review?.finalLinks?.length ?? 0) > 0;

  return hasContent || hasProgress ? "active" : "early";
}

export function collabEndPlanStepLabel(step: string | null | undefined): string {
  if (!step) return "";
  return COLLAB_PIPELINE.find((s) => s.id === step)?.title ?? step;
}

export function defaultCollabEndHandoff(tier: CollabEndTier): CollabEndHandoffTerms {
  return tier === "early" ? "joint_archive" : "keep_own";
}

export function collabEndTierHint(tier: CollabEndTier): string {
  return tier === "early"
    ? "ยังอยู่ช่วงเริ่มต้น — ยุติแล้วจะไม่นับเป็นจบงาน"
    : "มีความคืบหน้าแล้ว — ระบุเงื่อนไขส่งมอบงานที่ทำไปแล้ว";
}

/* ---- Chat protocol card ---- */

export const COLLAB_END_CARD_PREFIX = "__APLUS1_COLLAB_END__:";

export type CollabEndCardPayload = {
  v: 1;
  kind: "collab_end";
  endRequestId: string;
  collabRequestId: string;
};

export function encodeCollabEndCardMessage(payload: CollabEndCardPayload): string {
  return `${COLLAB_END_CARD_PREFIX}${JSON.stringify({ ...payload, v: 1, kind: "collab_end" })}`;
}

export function parseCollabEndCardMessage(
  content: string | null | undefined,
): CollabEndCardPayload | null {
  if (!content) return null;
  const trimmed = content.trim();
  const marker = "__APLUS1_COLLAB_END__";
  const idx = trimmed.indexOf(marker);
  if (idx < 0) return null;
  const after = trimmed.slice(idx + marker.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const start = after.indexOf("{");
    if (start < 0) return null;
    const raw = JSON.parse(after.slice(start)) as CollabEndCardPayload;
    if (!raw?.endRequestId || !raw?.collabRequestId) return null;
    return { ...raw, v: 1, kind: "collab_end" };
  } catch {
    return null;
  }
}

export function isCollabEndCardContent(content: string | null | undefined): boolean {
  return !!content && content.includes("__APLUS1_COLLAB_END__");
}

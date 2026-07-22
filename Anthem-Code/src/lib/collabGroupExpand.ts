/** Collab 1:1 → group expand with plan migrate/fresh + partner approval. */

import {
  COLLAB_PIPELINE,
  emptyCollabPlanDocument,
  emptyPlanPayload,
  stepAcksComplete,
  type CollabPlanAcks,
  type CollabPlanDocument,
  type CollabPlanStatus,
  type CollabPipelineStageId,
} from "@/lib/collabPlanDoc";

export const COLLAB_GROUP_EXPAND_EDIT_MS = 24 * 60 * 60 * 1000;
export const COLLAB_GROUP_EXPAND_EXPIRE_MS = 48 * 60 * 60 * 1000;

export type CollabGroupExpandStatus =
  | "pending"
  | "withdrawn"
  | "approved"
  | "rejected"
  | "expired";

export type CollabGroupExpandPlanMode = "migrate" | "fresh";

export type CollabGroupExpandRequestRow = {
  id: string;
  source_conversation_id: string;
  collab_request_id: string | null;
  proposed_by: string;
  status: CollabGroupExpandStatus;
  group_title: string;
  new_member_ids: string[];
  plan_mode: CollabGroupExpandPlanMode;
  plan_snapshot: Record<string, unknown>;
  source_plan_step: string | null;
  ack_preview: Record<string, unknown>;
  response_note: string | null;
  responded_by: string | null;
  responded_at: string | null;
  result_conversation_id: string | null;
  first_submitted_at: string;
  edit_until_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type CollabGroupExpandAckPreview = {
  done: number;
  totalBefore: number;
  totalAfter: number;
  stepTitle: string;
};

export function collabGroupExpandStepTitle(step: string | null | undefined): string {
  if (!step) return "";
  return COLLAB_PIPELINE.find((s) => s.id === step)?.title ?? step;
}

export function collabGroupExpandStatusLabel(
  status: CollabGroupExpandStatus | string | null | undefined,
): string {
  switch (status) {
    case "pending":
      return "รอคู่แชทยืนยัน";
    case "approved":
      return "สร้างกลุ่มแล้ว";
    case "rejected":
      return "ปฏิเสธการสร้างกลุ่ม";
    case "withdrawn":
      return "ถอนคำขอแล้ว";
    case "expired":
      return "หมดเวลาคำขอ";
    default:
      return status || "—";
  }
}

export function isCollabGroupExpandOpenStatus(status: string | null | undefined): boolean {
  return status === "pending";
}

export function buildCollabGroupExpandDeadlines(from = new Date()): {
  first_submitted_at: string;
  edit_until_at: string;
  expires_at: string;
} {
  const t = from.getTime();
  return {
    first_submitted_at: new Date(t).toISOString(),
    edit_until_at: new Date(t + COLLAB_GROUP_EXPAND_EDIT_MS).toISOString(),
    expires_at: new Date(t + COLLAB_GROUP_EXPAND_EXPIRE_MS).toISOString(),
  };
}

export function formatCollabGroupExpandRemaining(untilIso: string, now = Date.now()): string {
  const ms = new Date(untilIso).getTime() - now;
  if (ms <= 0) return "หมดเวลาแล้ว";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `อีก ${d} วัน ${h % 24} ชม.`;
  }
  if (h > 0) return `อีก ${h} ชม. ${m} นาที`;
  return `อีก ${Math.max(1, m)} นาที`;
}

/** Keep acks for source members only; recalc status when member count grows. */
export function trimAcksForSourceMembers(
  acks: CollabPlanAcks,
  sourceMemberIds: string[],
): CollabPlanAcks {
  const sourceSet = new Set(sourceMemberIds);
  const next: CollabPlanAcks = {};
  for (const stage of COLLAB_PIPELINE) {
    const map = acks[stage.id] ?? {};
    const trimmed: Record<string, string> = {};
    for (const [uid, ts] of Object.entries(map)) {
      if (sourceSet.has(uid)) trimmed[uid] = ts;
    }
    next[stage.id] = trimmed;
  }
  return next;
}

export function computeGroupExpandAckPreview(
  doc: CollabPlanDocument,
  sourceMemberIds: string[],
  newMemberIds: string[],
): CollabGroupExpandAckPreview {
  const totalBefore = sourceMemberIds.length;
  const totalAfter = newMemberIds.length;
  const step = doc.currentStep;
  const map = doc.acks[step] ?? {};
  const done = sourceMemberIds.filter((id) => !!map[id]).length;
  return {
    done,
    totalBefore,
    totalAfter,
    stepTitle: collabGroupExpandStepTitle(step),
  };
}

export function resolveStatusAfterMemberExpand(
  doc: CollabPlanDocument,
  acks: CollabPlanAcks,
  allMemberIds: string[],
): CollabPlanStatus {
  if (doc.status === "change_pending") return "change_pending";
  const step = doc.currentStep;
  if (stepAcksComplete(acks, step, allMemberIds)) return "step_locked";
  return "draft";
}

export function prepareMigratedPlanForGroup(input: {
  doc: CollabPlanDocument;
  sourceMemberIds: string[];
  allMemberIds: string[];
}): Pick<
  CollabPlanDocument,
  "payload" | "acks" | "status" | "currentStep" | "version"
> {
  const acks = trimAcksForSourceMembers(input.doc.acks, input.sourceMemberIds);
  const status = resolveStatusAfterMemberExpand(input.doc, acks, input.allMemberIds);
  return {
    payload: input.doc.payload,
    acks,
    status,
    currentStep: input.doc.currentStep,
    version: Math.max(1, (input.doc.version || 1) + 1),
  };
}

export function prepareFreshPlanForGroup(conversationId: string): Pick<
  CollabPlanDocument,
  "payload" | "acks" | "status" | "currentStep" | "version"
> {
  const base = emptyCollabPlanDocument(conversationId);
  return {
    payload: emptyPlanPayload(),
    acks: base.acks,
    status: "draft",
    currentStep: "align" as CollabPipelineStageId,
    version: 1,
  };
}

export function planModeLabel(mode: CollabGroupExpandPlanMode): string {
  return mode === "migrate" ? "ใช้แผนเดิม" : "แผนใหม่ (เริ่มขั้น 1)";
}

export function ackPreviewText(preview: CollabGroupExpandAckPreview): string {
  if (preview.totalAfter <= preview.totalBefore) {
    return `ยืนยัน ${preview.done}/${preview.totalBefore} · ขั้น「${preview.stepTitle}」`;
  }
  return `ยืนยัน ${preview.done}/${preview.totalBefore} → ${preview.done}/${preview.totalAfter} · ขั้น「${preview.stepTitle}」`;
}

/* ---- Chat card ---- */

export const COLLAB_GROUP_EXPAND_CARD_PREFIX = "__APLUS1_COLLAB_GROUP_EXPAND__:";

export type CollabGroupExpandCardPayload = {
  v: 1;
  kind: "collab_group_expand";
  expandRequestId: string;
  sourceConversationId: string;
};

export function encodeCollabGroupExpandCardMessage(
  payload: CollabGroupExpandCardPayload,
): string {
  return `${COLLAB_GROUP_EXPAND_CARD_PREFIX}${JSON.stringify({
    ...payload,
    v: 1,
    kind: "collab_group_expand",
  })}`;
}

export function parseCollabGroupExpandCardMessage(
  content: string | null | undefined,
): CollabGroupExpandCardPayload | null {
  if (!content) return null;
  const marker = "__APLUS1_COLLAB_GROUP_EXPAND__";
  const idx = content.indexOf(marker);
  if (idx < 0) return null;
  const after = content.slice(idx + marker.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const start = after.indexOf("{");
    if (start < 0) return null;
    const raw = JSON.parse(after.slice(start)) as CollabGroupExpandCardPayload;
    if (!raw?.expandRequestId || !raw?.sourceConversationId) return null;
    return { ...raw, v: 1, kind: "collab_group_expand" };
  } catch {
    return null;
  }
}

export function parseAckPreview(raw: unknown): CollabGroupExpandAckPreview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.done !== "number" || typeof o.totalAfter !== "number") return null;
  return {
    done: o.done,
    totalBefore: typeof o.totalBefore === "number" ? o.totalBefore : o.totalAfter,
    totalAfter: o.totalAfter,
    stepTitle: typeof o.stepTitle === "string" ? o.stepTitle : "",
  };
}

/**
 * Collab agreement — the short "what we agreed" plan that replaced the 4-step pipeline.
 * Stored inside collab_plans.payload.align (jsonb), so no new table; old plans convert on read.
 * Acks live in collab_plans.acks.align. Only roles / rights changes need everyone to re-confirm.
 */
import type { CollabPlanDocument, CollabPlanPayload } from "@/lib/collabPlanDoc";
import { emptyPlanPayload } from "@/lib/collabPlanDoc";

export const COLLAB_AGREEMENT_PREFIX = "🤝 แผนคอลแลป";

export const COLLAB_RIGHTS_PRESETS = [
  { id: "portfolio_credit", label: "ทุกคนลงพอร์ตได้ และให้เครดิตกัน" },
  { id: "after_launch", label: "ลงพอร์ตได้หลังเปิดตัวงาน" },
  { id: "non_commercial", label: "ห้ามใช้เชิงพาณิชย์" },
  { id: "custom", label: "กำหนดเอง" },
] as const;

export type CollabRightsPreset = (typeof COLLAB_RIGHTS_PRESETS)[number]["id"];

export type CollabAgreement = {
  what: string;
  /** userId → what they do */
  roles: Record<string, string>;
  brief: string;
  destinations: string[];
  /** YYYY-MM-DD */
  dueAt: string | null;
  rightsPreset: CollabRightsPreset;
  rightsNote: string;
  /** "เพิ่มรายละเอียด" (optional) */
  links: string[];
  deliverables: string[];
  note: string;
  /** ISO — set the first time someone sends it for confirmation. */
  sentAt: string | null;
};

export type CollabAgreementStatus = "draft" | "pending" | "agreed";

/** Fields everyone must re-confirm when they change after sending. */
export const AGREEMENT_RECONFIRM_FIELDS: (keyof CollabAgreement)[] = ["roles", "rightsPreset", "rightsNote"];

export const AGREEMENT_FIELD_LABELS: Partial<Record<keyof CollabAgreement, string>> = {
  what: "ทำอะไร",
  roles: "ใครทำอะไร",
  brief: "บรีฟ",
  destinations: "ปลายทางของงาน",
  dueAt: "วันเสร็จ",
  rightsPreset: "เครดิตและสิทธิ์",
  rightsNote: "เครดิตและสิทธิ์",
  links: "อ้างอิง",
  deliverables: "ชิ้นงานที่จะส่ง",
  note: "โน้ต",
};

type AlignExtras = {
  what?: string;
  roleMap?: Record<string, string>;
  destinations?: string[];
  rightsPreset?: string;
  sentAt?: string | null;
};

const presetIds = COLLAB_RIGHTS_PRESETS.map((p) => p.id) as string[];

function presetFromText(text: string): { preset: CollabRightsPreset; note: string } {
  const t = text.trim();
  if (!t) return { preset: "portfolio_credit", note: "" };
  const hit = COLLAB_RIGHTS_PRESETS.find((p) => p.id !== "custom" && p.label === t);
  return hit ? { preset: hit.id, note: "" } : { preset: "custom", note: t };
}

/** Read the agreement out of a plan payload; old (pipeline) plans are converted on the fly. */
export function agreementFromPayload(payload: CollabPlanPayload | null | undefined, ackedAny = false): CollabAgreement {
  const align = (payload?.align ?? emptyPlanPayload().align) as CollabPlanPayload["align"] & AlignExtras;
  const isNew = typeof align.what === "string";

  if (isNew) {
    return {
      what: align.what ?? "",
      roles: align.roleMap ?? {},
      brief: align.brief ?? "",
      destinations: Array.isArray(align.destinations) ? align.destinations : [],
      dueAt: align.dueAt ?? null,
      rightsPreset: presetIds.includes(align.rightsPreset ?? "")
        ? (align.rightsPreset as CollabRightsPreset)
        : "portfolio_credit",
      rightsNote: align.rightsPreset === "custom" ? align.rights ?? "" : "",
      links: align.referenceLinks ?? [],
      deliverables: (align.deliverableItems ?? []).filter((s) => s.trim()),
      note: align.timelineNote ?? "",
      sentAt: align.sentAt ?? null,
    };
  }

  // Legacy: idea held goal + brief + roles in one box.
  const ideaLines = (align.idea || [align.brief, align.roles].filter(Boolean).join("\n")).trim().split("\n");
  const what = (ideaLines.shift() ?? "").replace(/^(เป้าหมาย|ไอเดีย)\s*:\s*/, "").trim();
  const extra = ideaLines.join("\n").trim();
  const rights = presetFromText(align.rights ?? "");
  const hasContent = !!(what || extra || align.rights);
  return {
    what,
    roles: {},
    brief: extra,
    destinations: [],
    dueAt: align.dueAt ?? null,
    rightsPreset: rights.preset,
    rightsNote: rights.note,
    links: align.referenceLinks ?? [],
    deliverables: (align.deliverableItems ?? []).filter((s) => s.trim()),
    note: align.timelineNote ?? "",
    sentAt: hasContent && ackedAny ? new Date(0).toISOString() : null,
  };
}

export function rightsLabel(a: Pick<CollabAgreement, "rightsPreset" | "rightsNote">): string {
  if (a.rightsPreset === "custom") return a.rightsNote.trim() || "กำหนดเอง";
  return COLLAB_RIGHTS_PRESETS.find((p) => p.id === a.rightsPreset)?.label ?? "";
}

/** Write the agreement back, keeping the legacy fields filled for older readers. */
export function payloadWithAgreement(prev: CollabPlanPayload | null | undefined, a: CollabAgreement): CollabPlanPayload {
  const base = prev ?? emptyPlanPayload();
  const align: CollabPlanPayload["align"] & AlignExtras = {
    ...base.align,
    what: a.what,
    roleMap: a.roles,
    destinations: a.destinations,
    rightsPreset: a.rightsPreset,
    sentAt: a.sentAt,
    idea: [a.what, a.brief].filter((s) => s.trim()).join("\n"),
    brief: a.brief,
    dueAt: a.dueAt,
    rights: rightsLabel(a),
    referenceLinks: a.links,
    deliverableItems: a.deliverables,
    deliverables: a.deliverables.join("\n"),
    timelineNote: a.note,
  };
  return { ...base, quick: true, align };
}

export function agreementStatus(doc: CollabPlanDocument, memberIds: string[], a: CollabAgreement): CollabAgreementStatus {
  if (!a.sentAt) return "draft";
  const acks = doc.acks.align ?? {};
  return memberIds.length > 0 && memberIds.every((id) => acks[id]) ? "agreed" : "pending";
}

/** Which fields changed, and whether any of them needs everyone to confirm again. */
export function diffAgreement(before: CollabAgreement, after: CollabAgreement) {
  const changed = (Object.keys(after) as (keyof CollabAgreement)[]).filter(
    (k) => k !== "sentAt" && JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null),
  );
  return {
    changed,
    needsReconfirm: changed.some((k) => AGREEMENT_RECONFIRM_FIELDS.includes(k)),
    labels: Array.from(new Set(changed.map((k) => AGREEMENT_FIELD_LABELS[k]).filter(Boolean))) as string[],
  };
}

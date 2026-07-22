/**
 * Collab plan document model — joint workspace (not hire/money).
 * Multi-member acks lock a step; edits after lock need unanimous approval.
 */

import { isDemoMode } from "@/lib/demoMode";

export const COLLAB_PLAN_DOC_PREFIX = "📄 เอกสารแผนคอลแลป";
export const COLLAB_PLAN_PREFIX = "📋 แผนงานคอลแลป";
export const COLLAB_CHANGE_REQ_PREFIX = "📝 ขออนุญาตแก้ไขแผนคอลแลป";
export const COLLAB_CHANGE_DONE_PREFIX = "✏️ มีการแก้ไขแผนคอลแลป";
export const COLLAB_STEP_LOCKED_PREFIX = "🔒 ยืนยันแผนคอลแลปครบแล้ว";

export type CollabPipelineStageId = "align" | "create" | "review" | "publish";
export type CollabPlanStatus = "draft" | "step_locked" | "change_pending";

export type CollabAttachment = {
  path: string;
  name: string;
  contentType?: string;
};

export type CollabPortfolioRef = {
  projectId: string;
  title: string;
  ownerId: string;
};

export type CollabAlignPayload = {
  /** Combined: ไอเดีย / เป้าหมาย / บรีฟ / ใครทำอะไร */
  idea: string;
  /** @deprecated folded into idea */
  brief: string;
  /** @deprecated folded into idea */
  roles: string;
  referenceLinks: string[];
  portfolioRefs: CollabPortfolioRef[];
  timelineNote: string;
  draftAt: string | null;
  dueAt: string | null;
  /** วันที่ลงผลงานหรือจัดแสดงงาน (ไม่บังคับ) */
  releaseAt: string | null;
  /** Numbered deliverables 1. 2. 3. */
  deliverableItems: string[];
  /** @deprecated joined deliverableItems */
  deliverables: string;
  rights: string;
  attachments: CollabAttachment[];
};

export type CollabStepNotePayload = {
  note: string;
  attachments?: CollabAttachment[];
  /** Final deliverable URLs — review step before closing the collab. */
  finalLinks?: string[];
  /** Dated progress boxes (create / review). */
  progressEntries?: CollabProgressEntry[];
};

export type CollabProgressComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  /** Optional URLs attached to the comment. */
  links?: string[];
  /** Images / files attached to the comment. */
  attachments?: CollabAttachment[];
  /** Reply-to comment id (social thread). */
  parentId?: string | null;
  /** User ids who liked this comment. */
  likedBy?: string[];
};

export type CollabProgressEntry = {
  id: string;
  userId: string;
  /** Username of the person who added this entry (auto-set). */
  userName: string;
  /** YYYY-MM-DD */
  date: string;
  body: string;
  images: CollabAttachment[];
  /** Non-image files for this progress box. */
  files?: CollabAttachment[];
  comments: CollabProgressComment[];
  /** ISO timestamp — after confirm, others may comment. */
  confirmedAt?: string | null;
};

export type CollabPlanPayload = {
  align: CollabAlignPayload;
  create: CollabStepNotePayload;
  review: CollabStepNotePayload;
  publish: CollabStepNotePayload;
};

/** stepId -> userId -> ISO timestamp */
export type CollabPlanAcks = Partial<
  Record<CollabPipelineStageId, Record<string, string>>
>;

export type CollabPlanDocument = {
  conversationId: string;
  status: CollabPlanStatus;
  currentStep: CollabPipelineStageId;
  payload: CollabPlanPayload;
  acks: CollabPlanAcks;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  /** Legacy stages map kept for older UIs / migration. */
  stages?: Record<string, { done?: boolean; note?: string }>;
};

/** Immutable snapshot stored when a plan version is saved. */
export type CollabPlanVersionSnapshot = {
  version: number;
  payload: CollabPlanPayload;
  currentStep: CollabPipelineStageId;
  status: CollabPlanStatus;
  acks: CollabPlanAcks;
  savedBy: string | null;
  savedAt: string;
};

export type CollabPipelineStage = {
  id: CollabPipelineStageId;
  step: number;
  title: string;
  summary: string;
  prompts: string[];
  chatTemplate: string;
  noteSkeleton: string;
};

export const COLLAB_PIPELINE: CollabPipelineStage[] = [
  {
    id: "align",
    step: 1,
    title: "จัดแนวทางร่วมกัน",
    summary: "ไอเดีย/บรีฟ/บทบาท · ไทม์ไลน์ · ชิ้นงาน · สิทธิ์",
    prompts: ["ไอเดีย·บรีฟ·บทบาท", "ไทม์ไลน์", "ชิ้นงาน", "สิทธิ์"],
    chatTemplate:
      "คุยจัดแนวทางคอลแลปกันหน่อย:\n• เป้าหมายงานคืออะไร\n• สไตล์ / โทนที่อยากได้\n• ใครรับผิดชอบส่วนไหน\n• ส่งเมื่อไหร่\n• สิทธิ์ / เครดิต",
    noteSkeleton:
      "เป้าหมาย:\nบรีฟ:\nใครทำอะไร:\nไทม์ไลน์:\nชิ้นงาน:\nสิทธิ์:",
  },
  {
    id: "create",
    step: 2,
    title: "สร้างงาน",
    summary: "ลงมือทำ WIP แล้วแชร์ความคืบหน้า",
    prompts: ["WIP", "ไฟล์ล่าสุด", "ติดตรงไหน"],
    chatTemplate:
      "อัปเดตความคืบหน้าสร้างงาน:\n• ทำถึงไหนแล้ว\n• สิ่งที่อยากให้ดู\n• สิ่งที่ต้องการความช่วยเหลือ",
    noteSkeleton: "ความคืบหน้า:\nไฟล์/ลิงก์:\nติดตรงไหน:",
  },
  {
    id: "review",
    step: 3,
    title: "ยืนยันสุดท้าย",
    summary: "สรุปแผน · ลิงก์ผลงานสุดท้าย · ยืนยันครบก่อนจบ",
    prompts: ["สรุป", "ลิงก์ผลงาน", "ยืนยันจบงาน"],
    chatTemplate:
      "ยืนยันจบงานคอลแลป:\n• ลิงก์ผลงานสุดท้าย\n• เครดิต / แคปชัน\n• ทุกคนโอเคแล้วไหม",
    noteSkeleton: "ลิงก์ผลงาน:\nเครดิต/แคปชัน:\nหมายเหตุ:",
  },
  {
    id: "publish",
    step: 4,
    title: "ลงผลงานร่วมกัน",
    summary: "สรุปสุดท้าย · ดาวน์โหลด PDF · ลงพอร์ต",
    prompts: ["สรุป", "PDF", "พอร์ต"],
    chatTemplate:
      "สรุปจบงานคอลแลป:\n• ลิงก์ผลงาน\n• ดาวน์โหลดเอกสาร PDF\n• ลงพอร์ตร่วม",
    noteSkeleton: "ลิงก์พอร์ต:\nเอกสาร PDF:\nหมายเหตุ:",
  },
];

export type AlignSectionId =
  | "idea"
  | "brief"
  | "roles"
  | "timeline"
  | "deliverables"
  | "rights";

export const ALIGN_SECTIONS: { id: AlignSectionId; label: string }[] = [
  { id: "idea", label: "ไอเดีย/เป้าหมาย" },
  { id: "brief", label: "บรีฟ" },
  { id: "roles", label: "ใครทำอะไร" },
  { id: "timeline", label: "ไทม์ไลน์" },
  { id: "deliverables", label: "ชิ้นงานที่ต้องทำ" },
  { id: "rights", label: "สิทธิ์" },
];

export function emptyAlignPayload(): CollabAlignPayload {
  return {
    idea: "",
    brief: "",
    roles: "",
    referenceLinks: [],
    portfolioRefs: [],
    timelineNote: "",
    draftAt: null,
    dueAt: null,
    releaseAt: null,
    deliverableItems: ["", "", ""],
    deliverables: "",
    rights: "",
    attachments: [],
  };
}

/** Single overview text (idea + legacy brief/roles). */
export function getAlignOverview(align: CollabAlignPayload): string {
  return [align.idea, align.brief, align.roles]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");
}

export type AlignRequiredField = "idea" | "dueAt" | "deliverables" | "rights";

export type AlignValidationResult = {
  ok: boolean;
  missing: AlignRequiredField[];
};

/** Required before ack on the align step. */
export function validateAlignRequired(align: CollabAlignPayload): AlignValidationResult {
  const missing: AlignRequiredField[] = [];
  if (!getAlignOverview(align).trim()) missing.push("idea");
  if (!align.dueAt?.trim()) missing.push("dueAt");
  const hasDeliverable = (align.deliverableItems ?? []).some((d) => d.trim());
  if (!hasDeliverable) missing.push("deliverables");
  if (!align.rights.trim()) missing.push("rights");
  return { ok: missing.length === 0, missing };
}

export function deliverableItemsFromAlign(align: CollabAlignPayload): string[] {
  if (align.deliverableItems?.length) {
    return align.deliverableItems.length >= 3
      ? align.deliverableItems
      : [...align.deliverableItems, ...Array(3 - align.deliverableItems.length).fill("")];
  }
  const legacy = align.deliverables?.trim();
  if (!legacy) return ["", "", ""];
  return legacy
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[\.\)\-]\s*/, "").trim())
    .filter(Boolean);
}

function padDeliverableSlots(items: string[]): string[] {
  if (items.length >= 3) return items;
  return [...items, ...Array(3 - items.length).fill("")];
}

function asDeliverableItems(raw: unknown, legacyDeliverables: string): string[] {
  if (Array.isArray(raw) && raw.length) {
    const cleaned = raw.map((x) => (typeof x === "string" ? x : ""));
    const allBlank = cleaned.every((s) => !s.trim());
    if (allBlank) return ["", "", ""];
    return cleaned;
  }
  const legacy = legacyDeliverables.trim();
  if (!legacy) return ["", "", ""];
  const parsed = legacy
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[\.\)\-]\s*/, "").trim())
    .filter(Boolean);
  return parsed.length ? padDeliverableSlots(parsed) : ["", "", ""];
}

export const COLLAB_DISCUSSION_TEMPLATE_PREFIX = "💬 หัวข้อคุยแผนคอลแลป";

/** Topics for align step — shown on kickoff doc card and template card. */
export const COLLAB_ALIGN_DISCUSSION_TOPICS = [
  "ไอเดีย / เป้าหมาย / บรีฟ / ใครทำอะไร",
  "ลิงก์อ้างอิง",
  "อ้างอิงผลงานในพอร์ตของแต่ละคน",
  "ไทม์ไลน์ (วันเริ่มคอลแลป · กำหนดส่ง · รายละเอียด)",
  "ชิ้นงานที่ต้องทำ (1. 2. 3.)",
  "สิทธิ์ / เครดิต",
] as const;

/** Chat template: headings to discuss for this align page. */
export function buildAlignDiscussionTemplate(): string {
  return [
    COLLAB_DISCUSSION_TEMPLATE_PREFIX,
    "",
    "คุยตามหัวข้อเหล่านี้ แล้วสรุปใส่เอกสารแผน:",
    ...COLLAB_ALIGN_DISCUSSION_TOPICS.map((t, i) => `${i + 1}. ${t}`),
    `${COLLAB_ALIGN_DISCUSSION_TOPICS.length + 1}. ยืนยันสุดท้าย · ลิงก์ผลงานจบงาน`,
  ].join("\n");
}

export function isAlignDiscussionTemplateMessage(
  content: string | null | undefined,
): boolean {
  if (!content) return false;
  const t = content.trim();
  return (
    t.startsWith(COLLAB_DISCUSSION_TEMPLATE_PREFIX) ||
    t.startsWith("หัวข้อคุยแผนคอลแลป")
  );
}

export function emptyPlanPayload(): CollabPlanPayload {
  return {
    align: emptyAlignPayload(),
    create: { note: "", attachments: [], progressEntries: [] },
    review: { note: "", finalLinks: [], progressEntries: [] },
    publish: { note: "" },
  };
}

export function newProgressEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyProgressEntry(opts: {
  userId: string;
  userName: string;
  date?: string;
}): CollabProgressEntry {
  return {
    id: newProgressEntryId(),
    userId: opts.userId,
    userName: opts.userName || "สมาชิก",
    date: opts.date ?? new Date().toISOString().slice(0, 10),
    body: "",
    images: [],
    files: [],
    comments: [],
    confirmedAt: null,
  };
}

function asProgressComments(v: unknown): CollabProgressComment[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const text = asString(o.text).trim();
      const links = asStringList(o.links);
      const attachments = asAttachments(o.attachments);
      if (!text && links.length === 0 && attachments.length === 0) return null;
      const likedBy = Array.isArray(o.likedBy)
        ? o.likedBy.filter((x): x is string => typeof x === "string" && !!x)
        : [];
      const parentRaw = o.parentId;
      return {
        id: asString(o.id) || newProgressEntryId(),
        userId: asString(o.userId),
        userName: asString(o.userName) || "สมาชิก",
        text,
        createdAt:
          typeof o.createdAt === "string" && o.createdAt
            ? o.createdAt
            : new Date().toISOString(),
        links,
        attachments,
        parentId:
          typeof parentRaw === "string" && parentRaw
            ? parentRaw
            : parentRaw === null
              ? null
              : null,
        likedBy,
      };
    })
    .filter((x): x is CollabProgressComment => !!x);
}

export type ProgressCommentTree = {
  comment: CollabProgressComment;
  replies: ProgressCommentTree[];
};

/** Flat progress comments → social reply tree (max depth 2). */
export function buildProgressCommentTree(
  comments: CollabProgressComment[],
): ProgressCommentTree[] {
  const byParent = new Map<string | null, CollabProgressComment[]>();
  for (const c of comments) {
    const key = c.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const walk = (parentId: string | null, depth: number): ProgressCommentTree[] =>
    (byParent.get(parentId) ?? []).map((c) => ({
      comment: c,
      replies: depth < 2 ? walk(c.id, depth + 1) : [],
    }));
  return walk(null, 0);
}

export function countProgressComments(comments: CollabProgressComment[]): number {
  return comments.length;
}

function asProgressEntries(v: unknown): CollabProgressEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const confirmedRaw = o.confirmedAt;
      return {
        id: asString(o.id) || newProgressEntryId(),
        userId: asString(o.userId),
        userName: asString(o.userName) || "สมาชิก",
        date: (asString(o.date) || new Date().toISOString()).slice(0, 10),
        body: asString(o.body),
        images: asAttachments(o.images),
        files: asAttachments(o.files),
        comments: asProgressComments(o.comments),
        confirmedAt:
          typeof confirmedRaw === "string" && confirmedRaw
            ? confirmedRaw
            : confirmedRaw === null
              ? null
              : // Legacy entries without confirmedAt behave as already posted.
                "legacy",
      };
    })
    .filter((x): x is CollabProgressEntry => !!x);
}

/** Prefer progressEntries; migrate legacy note/attachments into one box. */
export function normalizeStepProgressEntries(
  step: CollabStepNotePayload,
  fallback?: { userId?: string; userName?: string },
): CollabProgressEntry[] {
  if (step.progressEntries && step.progressEntries.length > 0) {
    return step.progressEntries;
  }
  const note = step.note?.trim() ?? "";
  const images = step.attachments ?? [];
  if (!note && images.length === 0) return [];
  return [
    {
      id: "legacy-migrated",
      userId: fallback?.userId ?? "",
      userName: fallback?.userName || "สมาชิก",
      date: new Date().toISOString().slice(0, 10),
      body: note,
      images,
      files: [],
      comments: [],
      confirmedAt: "legacy",
    },
  ];
}

export function isProgressEntryConfirmed(entry: CollabProgressEntry): boolean {
  return !!entry.confirmedAt;
}

export function summarizeProgressEntries(entries: CollabProgressEntry[]): string {
  return entries
    .map((e) => {
      const head = [e.date, e.userName].filter(Boolean).join(" · ");
      const body = e.body.trim();
      if (!head && !body) return "";
      return [head, body].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function normalizeStepNotePayload(
  raw: Record<string, unknown> | undefined,
  opts?: { withFinalLinks?: boolean },
): CollabStepNotePayload {
  const note = asString(raw?.note);
  const attachments = asAttachments(raw?.attachments);
  const progressEntries = asProgressEntries(raw?.progressEntries);
  const migrated =
    progressEntries.length > 0
      ? progressEntries
      : normalizeStepProgressEntries({ note, attachments });
  const out: CollabStepNotePayload = {
    note: migrated.length ? summarizeProgressEntries(migrated) : note,
    attachments:
      migrated.length > 0
        ? migrated.flatMap((e) => [...e.images, ...(e.files ?? [])])
        : attachments,
    progressEntries: migrated,
  };
  if (opts?.withFinalLinks) {
    out.finalLinks = asStringList(raw?.finalLinks);
  }
  return out;
}

export function emptyCollabPlanDocument(conversationId: string): CollabPlanDocument {
  return {
    conversationId,
    status: "draft",
    currentStep: "align",
    payload: emptyPlanPayload(),
    acks: {},
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

function asPortfolioRefs(v: unknown): CollabPortfolioRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      if (typeof o.projectId !== "string" || !o.projectId) return null;
      return {
        projectId: o.projectId,
        title: typeof o.title === "string" ? o.title : "ผลงาน",
        ownerId: typeof o.ownerId === "string" ? o.ownerId : "",
      };
    })
    .filter((x): x is CollabPortfolioRef => !!x);
}

function asAttachments(v: unknown): CollabAttachment[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      if (typeof o.path !== "string" || !o.path) return null;
      return {
        path: o.path,
        name: typeof o.name === "string" ? o.name : o.path.split("/").pop() || "file",
        contentType: typeof o.contentType === "string" ? o.contentType : undefined,
      };
    })
    .filter((x): x is CollabAttachment => !!x);
}

/** Migrate legacy note-only stages into structured payload. */
export function normalizeCollabPlanDocument(
  conversationId: string,
  row: Record<string, unknown> | null | undefined,
): CollabPlanDocument {
  const base = emptyCollabPlanDocument(conversationId);
  if (!row) return base;

  const payloadRaw = row.payload;
  if (payloadRaw && typeof payloadRaw === "object") {
    const p = payloadRaw as Record<string, unknown>;
    const alignRaw = (p.align && typeof p.align === "object" ? p.align : {}) as Record<
      string,
      unknown
    >;
    base.payload = {
      align: {
        idea: asString(alignRaw.idea),
        brief: asString(alignRaw.brief),
        roles: asString(alignRaw.roles),
        referenceLinks: asStringList(alignRaw.referenceLinks),
        portfolioRefs: asPortfolioRefs(alignRaw.portfolioRefs),
        timelineNote: asString(alignRaw.timelineNote),
        draftAt: typeof alignRaw.draftAt === "string" ? alignRaw.draftAt : null,
        dueAt: typeof alignRaw.dueAt === "string" ? alignRaw.dueAt : null,
        releaseAt: typeof alignRaw.releaseAt === "string" ? alignRaw.releaseAt : null,
        deliverables: asString(alignRaw.deliverables),
        deliverableItems: asDeliverableItems(
          alignRaw.deliverableItems,
          asString(alignRaw.deliverables),
        ),
        rights: asString(alignRaw.rights),
        attachments: asAttachments(alignRaw.attachments),
      },
      create: normalizeStepNotePayload(
        p.create && typeof p.create === "object"
          ? (p.create as Record<string, unknown>)
          : undefined,
      ),
      review: normalizeStepNotePayload(
        p.review && typeof p.review === "object"
          ? (p.review as Record<string, unknown>)
          : undefined,
        { withFinalLinks: true },
      ),
      publish: {
        note: asString((p.publish as Record<string, unknown> | undefined)?.note),
      },
    };
  } else if (row.stages && typeof row.stages === "object") {
    // Legacy: stages.align.note etc.
    const stages = row.stages as Record<string, { note?: string; done?: boolean }>;
    const alignNote = stages.align?.note || "";
    base.payload.align.idea = alignNote;
    base.payload.create.note = stages.create?.note || "";
    base.payload.review.note = stages.review?.note || "";
    base.payload.publish.note = stages.publish?.note || "";
  }

  const status = row.status;
  if (status === "draft" || status === "step_locked" || status === "change_pending") {
    base.status = status;
  }
  const step = row.current_step ?? row.currentStep;
  if (step === "align" || step === "create" || step === "review" || step === "publish") {
    base.currentStep = step;
  }
  if (row.acks && typeof row.acks === "object") {
    base.acks = row.acks as CollabPlanAcks;
  }
  if (typeof row.version === "number") base.version = row.version;
  if (typeof row.updated_at === "string") base.updatedAt = row.updated_at;
  if (typeof row.updated_by === "string" || row.updated_by === null) {
    base.updatedBy = row.updated_by as string | null;
  }
  return base;
}

export function normalizeCollabPlanVersionSnapshot(
  row: Record<string, unknown>,
): CollabPlanVersionSnapshot {
  const conversationId =
    typeof row.conversation_id === "string" ? row.conversation_id : "";
  const doc = normalizeCollabPlanDocument(conversationId, row);
  return {
    version: typeof row.version === "number" ? row.version : doc.version,
    payload: doc.payload,
    currentStep: doc.currentStep,
    status: doc.status,
    acks: doc.acks,
    savedBy:
      typeof row.saved_by === "string"
        ? row.saved_by
        : typeof row.updated_by === "string"
          ? row.updated_by
          : null,
    savedAt:
      typeof row.saved_at === "string"
        ? row.saved_at
        : typeof row.updated_at === "string"
          ? row.updated_at
          : new Date().toISOString(),
  };
}

export function memberIdsFromConversation(conv: {
  client_id?: string | null;
  freelancer_id?: string | null;
  conversation_type?: string | null;
}): string[] {
  const ids = [conv.client_id, conv.freelancer_id].filter(
    (x): x is string => typeof x === "string" && !!x,
  );
  return Array.from(new Set(ids));
}

export function stepAcksComplete(
  acks: CollabPlanAcks,
  step: CollabPipelineStageId,
  memberIds: string[],
): boolean {
  if (!memberIds.length) return false;
  const map = acks[step] ?? {};
  return memberIds.every((id) => !!map[id]);
}

/** Production rule: every step needs unanimous member ack before advancing. */
export const COLLAB_PLAN_REQUIRES_UNANIMOUS_ACK = true;

/**
 * Demo / local dev only — skip ack gate for pipeline navigation UX testing.
 * Production builds (VITE_DEMO_MODE=false, not dev) always enforce acks.
 */
export function collabPlanDemoShortcutsEnabled(): boolean {
  return isDemoMode() || import.meta.env.DEV;
}

export function countStepAcks(
  acks: CollabPlanAcks,
  step: CollabPipelineStageId,
  memberIds: string[],
): { done: number; total: number; missing: string[] } {
  const map = acks[step] ?? {};
  const missing = memberIds.filter((id) => !map[id]);
  return { done: memberIds.length - missing.length, total: memberIds.length, missing };
}

/** Can freely edit when draft OR approved change window (status draft after unlock). */
export function canEditPlanContent(doc: CollabPlanDocument): boolean {
  return doc.status === "draft";
}

export function canAdvanceStep(
  doc: CollabPlanDocument,
  memberIds: string[],
): boolean {
  return (
    doc.status === "step_locked" &&
    stepAcksComplete(doc.acks, doc.currentStep, memberIds)
  );
}

export function nextStepId(
  step: CollabPipelineStageId,
): CollabPipelineStageId | null {
  const idx = COLLAB_PIPELINE.findIndex((s) => s.id === step);
  if (idx < 0 || idx >= COLLAB_PIPELINE.length - 1) return null;
  return COLLAB_PIPELINE[idx + 1]!.id;
}

export function prevStepId(
  step: CollabPipelineStageId,
): CollabPipelineStageId | null {
  const idx = COLLAB_PIPELINE.findIndex((s) => s.id === step);
  if (idx <= 0) return null;
  return COLLAB_PIPELINE[idx - 1]!.id;
}

export function countCollabPlanProgress(
  docOrState: CollabPlanDocument | CollabPlanState,
): { done: number; total: number } {
  const total = COLLAB_PIPELINE.length;
  if ("stages" in docOrState && !("payload" in docOrState)) {
    const done = COLLAB_PIPELINE.filter((s) => docOrState.stages[s.id]?.done).length;
    return { done, total };
  }
  const doc = docOrState as CollabPlanDocument;
  if (doc.currentStep === "publish" && doc.status === "step_locked") {
    return { done: total, total };
  }
  const idx = COLLAB_PIPELINE.findIndex((x) => x.id === doc.currentStep);
  const completedBefore = Math.max(0, idx);
  const currentDone = doc.status === "step_locked" ? 1 : 0;
  return { done: completedBefore + currentDone, total };
}

export function buildCollabPlanDocumentMessage(opts?: {
  projectTitle?: string | null;
}): string {
  const title = opts?.projectTitle?.trim() || "คอลแลป";
  return [
    COLLAB_PLAN_DOC_PREFIX,
    `เรื่อง: ${title}`,
    "สถานะ: ตอบรับแล้ว — เริ่มวางแผนร่วมกัน",
    "",
    "แนวทางทำงานร่วมกัน (4 ขั้น):",
    ...COLLAB_PIPELINE.map((s) => `${s.step}. ${s.title} — ${s.summary}`),
    "",
    "ทุกคนต้องกด「ขั้นนี้ตกลงแล้ว」ครบก่อนไปขั้นถัดไป",
    "หลังยืนยันแล้ว แก้รายละเอียดต้องขออนุมัติจากทุกคนในแชท",
  ].join("\n");
}

export function isCollabPlanDocumentMessage(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_PLAN_DOC_PREFIX);
}

export function buildChangeRequestMessage(opts: {
  requestId: string;
  stepLabel: string;
  reason?: string;
}): string {
  return [
    COLLAB_CHANGE_REQ_PREFIX,
    `request_id:${opts.requestId}`,
    `ขั้น: ${opts.stepLabel}`,
    opts.reason?.trim() ? `เหตุผล: ${opts.reason.trim()}` : null,
    "",
    "ทุกคนในแชทต้องกดอนุมัติ จึงจะแก้แผนได้",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseChangeRequestMessage(content: string | null | undefined): {
  requestId: string;
  stepLabel: string;
  reason: string;
} | null {
  if (!content?.trim().startsWith(COLLAB_CHANGE_REQ_PREFIX)) return null;
  const lines = content.trim().split("\n");
  const idLine = lines.find((l) => l.startsWith("request_id:"));
  const requestId = idLine?.replace("request_id:", "").trim() || "";
  if (!requestId) return null;
  const stepLabel =
    lines.find((l) => l.startsWith("ขั้น:"))?.replace("ขั้น:", "").trim() || "";
  const reason =
    lines.find((l) => l.startsWith("เหตุผล:"))?.replace("เหตุผล:", "").trim() || "";
  return { requestId, stepLabel, reason };
}

export function buildChangeDoneMessage(stepLabel: string): string {
  return [
    COLLAB_CHANGE_DONE_PREFIX,
    `ขั้น: ${stepLabel}`,
    "แผนถูกแก้ไขแล้ว — สมาชิกควรตรวจและยืนยันขั้นนี้อีกครั้ง",
  ].join("\n");
}

export function isChangeDoneMessage(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_CHANGE_DONE_PREFIX);
}

export function isChangeRequestMessage(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_CHANGE_REQ_PREFIX);
}

export function buildStepLockedMessage(stepLabel: string): string {
  return [
    COLLAB_STEP_LOCKED_PREFIX,
    `ขั้น「${stepLabel}」ยืนยันครบทุกคนแล้ว`,
    "ไปขั้นถัดไปได้ หรือขอยื่นแก้ไขถ้าต้องปรับรายละเอียด",
  ].join("\n");
}

export function isStepLockedMessage(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_STEP_LOCKED_PREFIX);
}

// --- Compat aliases used by older UI pieces ---
export type CollabPlanState = {
  stages: Record<CollabPipelineStageId, { done: boolean; note: string }>;
  updatedAt: string;
  updatedBy?: string | null;
};

export function emptyCollabPlanState(): CollabPlanState {
  return {
    stages: {
      align: { done: false, note: "" },
      create: { done: false, note: "" },
      review: { done: false, note: "" },
      publish: { done: false, note: "" },
    },
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };
}

export function normalizeCollabPlanState(raw: unknown): CollabPlanState {
  const base = emptyCollabPlanState();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;

  // Legacy 7-step → fold talk/brief/scope/rights into align
  if (row.stages && typeof row.stages === "object" && !row.payload) {
    const stages = row.stages as Record<string, { note?: string; done?: boolean }>;
    if (stages.talk || stages.brief || stages.scope || stages.rights) {
      const alignParts = [
        stages.talk?.note,
        stages.brief?.note,
        stages.scope?.note,
        stages.rights?.note,
      ].filter((x): x is string => !!x?.trim());
      base.stages.align = {
        done: !!(stages.talk?.done && stages.brief?.done && stages.scope?.done),
        note: alignParts.join("\n"),
      };
      base.stages.create = {
        done: !!stages.create?.done,
        note: stages.create?.note || "",
      };
      base.stages.review = {
        done: !!stages.review?.done,
        note: stages.review?.note || "",
      };
      base.stages.publish = {
        done: !!stages.publish?.done,
        note: stages.publish?.note || "",
      };
      return base;
    }
  }

  const doc = normalizeCollabPlanDocument("x", row);
  const alignDeliverables = deliverableItemsFromAlign(doc.payload.align)
    .map((d) => d.trim())
    .filter(Boolean);
  base.stages.align = {
    done: doc.currentStep !== "align" || doc.status === "step_locked",
    note: [
      getAlignOverview(doc.payload.align),
      doc.payload.align.dueAt ? `กำหนดส่ง: ${doc.payload.align.dueAt.slice(0, 10)}` : "",
      doc.payload.align.timelineNote,
      alignDeliverables.length
        ? alignDeliverables.map((d, i) => `${i + 1}. ${d}`).join("\n")
        : doc.payload.align.deliverables,
      doc.payload.align.rights ? `สิทธิ์:\n${doc.payload.align.rights}` : "",
    ]
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n\n"),
  };
  base.stages.create = {
    done:
      ["review", "publish"].includes(doc.currentStep) ||
      (doc.currentStep === "create" && doc.status === "step_locked"),
    note:
      summarizeProgressEntries(normalizeStepProgressEntries(doc.payload.create)) ||
      doc.payload.create.note,
  };
  base.stages.review = {
    done:
      doc.currentStep === "publish" ||
      (doc.currentStep === "review" && doc.status === "step_locked"),
    note:
      summarizeProgressEntries(normalizeStepProgressEntries(doc.payload.review)) ||
      doc.payload.review.note,
  };
  base.stages.publish = {
    done: doc.currentStep === "publish" && doc.status === "step_locked",
    note: doc.payload.publish.note,
  };
  base.updatedAt = doc.updatedAt;
  base.updatedBy = doc.updatedBy;
  return base;
}

export function detectCollabToolKind(
  content: string | null | undefined,
): "plan" | "roles" | "refs" | "checkin" | null {
  if (!content) return null;
  const t = content.trim();
  if (isCollabPlanDocumentMessage(t)) return null;
  if (isAlignDiscussionTemplateMessage(t)) return null;
  if (isChangeRequestMessage(t) || isChangeDoneMessage(t) || isStepLockedMessage(t)) {
    return null;
  }
  if (t.startsWith(COLLAB_PLAN_PREFIX) || t.startsWith("📋 แผนคอลแลป")) return "plan";
  if (t.startsWith("🎭 แบ่งบทบาท")) return "roles";
  if (t.startsWith("🔗 อ้างอิงร่วม")) return "refs";
  if (t.startsWith("✅ เช็คอินคอลแลป")) return "checkin";
  return null;
}

export const COLLAB_TOOL_PREFIX = {
  plan: COLLAB_PLAN_PREFIX,
  roles: "🎭 แบ่งบทบาท",
  refs: "🔗 อ้างอิงร่วม",
  checkin: "✅ เช็คอินคอลแลป",
  planLegacy: "📋 แผนคอลแลป",
} as const;

export type CollabBriefTemplate = {
  typeKey: string;
  label: string;
  hint: string;
  body: string;
};

export const COLLAB_BRIEF_TEMPLATES: CollabBriefTemplate[] = [
  {
    typeKey: "chat",
    label: "พูดคุย",
    hint: "เปิดบทสนทนาเบา ๆ",
    body: "สวัสดีครับ/ค่ะ สนใจคุยไอเดียกับคุณจากงานที่เห็น\n\n• สิ่งที่ชอบในงานคุณ:\n• อยากแลกเปลี่ยนเรื่อง:\n• ช่วงที่สะดวกคุย:",
  },
  {
    typeKey: "joint-project",
    label: "ร่วมโปรเจกต์",
    hint: "ชวนทำชิ้นงานด้วยกัน",
    body: "สนใจชวนร่วมโปรเจกต์สั้น ๆ ครับ/ค่ะ\n\n• แนวงาน / โจทย์คร่าว ๆ:\n• ส่วนที่อยากให้ช่วย:\n• ส่วนที่ฉันรับผิดชอบ:\n• เป้าหมายส่ง:\n• ช่วงเวลาโดยประมาณ:",
  },
  {
    typeKey: "skill-swap",
    label: "แลกสกิล",
    hint: "แลกความสามารถแบบ win-win",
    body: "อยากแลกสกิลกันครับ/ค่ะ\n\n• ฉันช่วยได้:\n• อยากได้ความช่วยเหลือเรื่อง:\n• ขอบเขตงาน:\n• ระยะเวลาที่โอเค:",
  },
  {
    typeKey: "experiment",
    label: "งานทดลอง",
    hint: "ลองสไตล์ใหม่แบบไม่ซีเรียส",
    body: "อยากชวนลองงานทดลอง / สะสมพอร์ตร่วมกัน\n\n• ธีม:\n• ผลลัพธ์:\n• เวลา:\n• เผยแพร่ร่วมได้ไหม:",
  },
  {
    typeKey: "content",
    label: "คอนเทนต์",
    hint: "โปรโมต / ทำคอนเทนต์คู่",
    body: "สนใจทำคอนเทนต์หรือโปรโมตร่วมกันครับ/ค่ะ\n\n• แพลตฟอร์ม:\n• รูปแบบ:\n• สิ่งที่แต่ละฝ่ายเตรียม:\n• ช่วงเวลาโพสต์:",
  },
  {
    typeKey: "other",
    label: "อื่นๆ",
    hint: "ระบุเอง",
    body: "อยากชวนคอลแลปแบบนี้ครับ/ค่ะ\n\n• รูปแบบ:\n• เป้าหมาย:\n• สิ่งที่คาดหวัง:\n• ช่วงเวลา:",
  },
];

export function briefTemplateForTypes(typeKeys: string[]): CollabBriefTemplate | null {
  if (!typeKeys.length) return null;
  for (const key of typeKeys) {
    const hit = COLLAB_BRIEF_TEMPLATES.find((t) => t.typeKey === key);
    if (hit) return hit;
  }
  return null;
}

export function buildCollabPipelineMessage(docOrState: CollabPlanDocument | CollabPlanState): string {
  if ("payload" in docOrState) {
    const doc = docOrState;
    const { done, total } = countCollabPlanProgress(doc);
    return [
      COLLAB_PLAN_PREFIX,
      `ความคืบหน้า ${done}/${total}`,
      `สถานะ: ${doc.status}`,
      `ขั้นปัจจุบัน: ${COLLAB_PIPELINE.find((s) => s.id === doc.currentStep)?.title ?? doc.currentStep}`,
      "",
      ...COLLAB_PIPELINE.map((s) => {
        const order = COLLAB_PIPELINE.findIndex((x) => x.id === s.id);
        const cur = COLLAB_PIPELINE.findIndex((x) => x.id === doc.currentStep);
        const mark = order < cur || (order === cur && doc.status === "step_locked") ? "☑" : "□";
        return `${mark} ${s.step}. ${s.title}`;
      }),
    ].join("\n");
  }
  const state = docOrState;
  const done = COLLAB_PIPELINE.filter((s) => state.stages[s.id]?.done).length;
  return [
    COLLAB_PLAN_PREFIX,
    `ความคืบหน้า ${done}/4`,
    "",
    ...COLLAB_PIPELINE.map((s) => {
      const mark = state.stages[s.id]?.done ? "☑" : "□";
      const note = state.stages[s.id]?.note?.trim();
      return note
        ? `${mark} ${s.step}. ${s.title}\n${note}`
        : `${mark} ${s.step}. ${s.title}`;
    }),
  ].join("\n");
}

import { describe, expect, it } from "vitest";
import {
  briefTemplateForTypes,
  buildAlignDiscussionTemplate,
  buildChangeRequestMessage,
  buildCollabPipelineMessage,
  buildCollabPlanDocumentMessage,
  COLLAB_PIPELINE,
  COLLAB_PLAN_PREFIX,
  countCollabPlanProgress,
  detectCollabToolKind,
  emptyCollabPlanDocument,
  emptyCollabPlanState,
  isAlignDiscussionTemplateMessage,
  isChangeRequestMessage,
  isCollabPlanDocumentMessage,
  normalizeCollabPlanState,
  parseChangeRequestMessage,
  stepAcksComplete,
} from "@/lib/collabToolkit";

describe("collabToolkit", () => {
  it("picks first matching brief template", () => {
    const tpl = briefTemplateForTypes(["skill-swap", "chat"]);
    expect(tpl?.typeKey).toBe("skill-swap");
    expect(tpl?.body).toContain("อยากแลกสกิล");
  });

  it("returns null when no types", () => {
    expect(briefTemplateForTypes([])).toBeNull();
  });

  it("has compact 4-step pipeline", () => {
    expect(COLLAB_PIPELINE.map((s) => s.id)).toEqual([
      "align",
      "create",
      "review",
      "publish",
    ]);
  });

  it("builds formal plan document on accept", () => {
    const msg = buildCollabPlanDocumentMessage({ projectTitle: "งานทดลอง" });
    expect(isCollabPlanDocumentMessage(msg)).toBe(true);
    expect(msg).toContain("เรื่อง: งานทดลอง");
    expect(msg).toContain("1. จัดแนวทางร่วมกัน");
    expect(detectCollabToolKind(msg)).toBeNull();
  });

  it("builds align discussion template card payload", () => {
    const msg = buildAlignDiscussionTemplate();
    expect(isAlignDiscussionTemplateMessage(msg)).toBe(true);
    expect(msg).toContain("1. ไอเดีย");
    expect(detectCollabToolKind(msg)).toBeNull();
  });

  it("builds pipeline snapshot with shared notes", () => {
    const state = emptyCollabPlanState();
    state.stages.align = { done: true, note: "เป้าหมาย: ทำพอร์ตร่วม\nสไตล์: มินิมอล" };
    state.stages.create = { done: true, note: "" };
    const msg = buildCollabPipelineMessage(state);
    expect(msg.startsWith(COLLAB_PLAN_PREFIX)).toBe(true);
    expect(msg).toContain("ความคืบหน้า 2/4");
    expect(msg).toContain("เป้าหมาย: ทำพอร์ตร่วม");
    expect(detectCollabToolKind(msg)).toBe("plan");
    expect(countCollabPlanProgress(state)).toEqual({ done: 2, total: 4 });
  });

  it("migrates legacy 7-step plans into align", () => {
    const state = normalizeCollabPlanState({
      stages: {
        talk: { done: true, note: "ชอบสไตล์มินิมอล" },
        brief: { done: true, note: "ทำพอร์ตร่วม" },
        scope: { done: true, note: "A ออกแบบ B ตัดต่อ" },
        rights: { done: false, note: "เครดิตทั้งคู่" },
        create: { done: false, note: "" },
        review: { done: false, note: "" },
        publish: { done: false, note: "" },
      },
    });
    expect(state.stages.align.note).toContain("ชอบสไตล์มินิมอล");
    expect(state.stages.align.note).toContain("ทำพอร์ตร่วม");
    expect(state.stages.align.note).toContain("เครดิตทั้งคู่");
  });

  it("stages include discussion templates and note skeletons", () => {
    for (const s of COLLAB_PIPELINE) {
      expect(s.chatTemplate.length).toBeGreaterThan(10);
      expect(s.noteSkeleton.length).toBeGreaterThan(5);
    }
  });

  it("requires all members to ack a step", () => {
    const doc = emptyCollabPlanDocument("c1");
    const members = ["a", "b"];
    expect(stepAcksComplete(doc.acks, "align", members)).toBe(false);
    doc.acks.align = { a: new Date().toISOString() };
    expect(stepAcksComplete(doc.acks, "align", members)).toBe(false);
    doc.acks.align = { a: "t", b: "t" };
    expect(stepAcksComplete(doc.acks, "align", members)).toBe(true);
  });

  it("parses change request chat cards", () => {
    const msg = buildChangeRequestMessage({
      requestId: "req-1",
      stepLabel: "จัดแนวทางร่วมกัน",
      reason: "สโคปเปลี่ยน",
    });
    expect(isChangeRequestMessage(msg)).toBe(true);
    expect(parseChangeRequestMessage(msg)).toEqual({
      requestId: "req-1",
      stepLabel: "จัดแนวทางร่วมกัน",
      reason: "สโคปเปลี่ยน",
    });
    expect(detectCollabToolKind(msg)).toBeNull();
  });

  it("ignores normal chat text", () => {
    expect(detectCollabToolKind("สวัสดี อยากคุยไอเดีย")).toBeNull();
  });
});

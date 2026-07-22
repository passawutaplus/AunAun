import { describe, expect, it } from "vitest";
import {
  detectCollabEndTier,
  encodeCollabEndCardMessage,
  parseCollabEndCardMessage,
  creditRequestedSummary,
  collabEndHandoffDefaultCredit,
  collabEndSettlementSummary,
  countCollabProgressForUser,
  defaultCollabEndSettlement,
  handoffToSettlementPreset,
  canGrantVoluntaryCollabEndCredit,
  canRespondToCollabEndRequest,
  isCollabEndInstantExit,
  settlementPresetDefaultCredit,
  settlementPresetInstantExit,
  settlementPresetToHandoff,
} from "@/lib/collabEndRequest";
import { emptyCollabPlanDocument, emptyPlanPayload } from "@/lib/collabPlanDoc";

describe("collabEndRequest", () => {
  it("detects early tier when no plan persisted", () => {
    expect(detectCollabEndTier(null, false)).toBe("early");
  });

  it("detects active tier on create step with progress", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    doc.currentStep = "create";
    doc.payload = {
      ...emptyPlanPayload(),
      create: {
        note: "",
        progressEntries: [
          {
            id: "1",
            userId: "u1",
            userName: "A",
            text: "WIP",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };
    expect(detectCollabEndTier(doc, true)).toBe("active");
  });

  it("detects active tier near publish with step_locked", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    doc.currentStep = "publish";
    doc.status = "step_locked";
    doc.payload.review.finalLinks = ["https://example.com/work"];
    expect(detectCollabEndTier(doc, true)).toBe("active");
  });

  it("round-trips chat card payload", () => {
    const payload = {
      v: 1 as const,
      kind: "collab_end" as const,
      endRequestId: "end-1",
      collabRequestId: "collab-1",
    };
    const msg = encodeCollabEndCardMessage(payload);
    expect(parseCollabEndCardMessage(msg)).toEqual(payload);
  });

  it("counts progress entries per user", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    doc.payload.create.progressEntries = [
      {
        id: "1",
        userId: "u1",
        userName: "A",
        date: "2026-01-01",
        body: "WIP",
        images: [],
        comments: [],
      },
      {
        id: "2",
        userId: "u2",
        userName: "B",
        date: "2026-01-02",
        body: "WIP2",
        images: [],
        comments: [],
      },
    ];
    expect(countCollabProgressForUser(doc, "u1")).toBe(1);
    expect(countCollabProgressForUser(doc, "u2")).toBe(1);
  });

  it("summarizes credit request", () => {
    const summary = creditRequestedSummary({
      credit_mode: "credit_requested",
      credit_request_text: "Character design",
      portfolio_requested: true,
      style_requested: false,
      progress_count_initiator: 3,
    });
    expect(summary).toContain("Character design");
    expect(summary).toContain("ลงพอร์ต");
    expect(summary).toContain("progress 3");
  });

  it("maps handoff preset to default credit mode", () => {
    expect(collabEndHandoffDefaultCredit("split_publish")).toBe("credit_requested");
    expect(settlementPresetDefaultCredit("credit_requested")).toBe("credit_requested");
    expect(settlementPresetToHandoff("no_claim")).toBe("joint_archive");
    expect(settlementPresetToHandoff("credit_requested")).toBe("split_publish");
    expect(handoffToSettlementPreset("return_all")).toBe("no_claim");
    expect(handoffToSettlementPreset("keep_own", "credit_requested")).toBe("credit_requested");
    expect(settlementPresetInstantExit("no_claim")).toBe(true);
    expect(settlementPresetInstantExit("credit_requested")).toBe(false);
    expect(defaultCollabEndSettlement("early")).toBe("no_claim");
  });

  it("summarizes settlement presets", () => {
    expect(collabEndSettlementSummary("joint_archive", "no_credit")).toBe(
      "สละสิทธิ์และเครดิตทั้งหมด",
    );
    expect(collabEndSettlementSummary("split_publish", "credit_requested")).toBe(
      "ขอเครดิต/สิทธิ์ (legacy)",
    );
  });

  it("allows respond only for legacy credit_requested pending", () => {
    const pendingCredit = {
      status: "pending" as const,
      initiator_id: "u1",
      respond_deadline_at: new Date(Date.now() + 3600_000).toISOString(),
      credit_mode: "credit_requested" as const,
    };
    expect(canRespondToCollabEndRequest(pendingCredit, "u2")).toBe(true);
    expect(
      canRespondToCollabEndRequest({ ...pendingCredit, credit_mode: "no_credit" }, "u2"),
    ).toBe(false);
  });

  it("allows voluntary credit grant after instant withdraw", () => {
    const row = {
      status: "approved" as const,
      initiator_id: "u1",
      response_credit_outcome: null,
      credit_mode: "no_credit" as const,
      handoff_terms: "joint_archive" as const,
      responder_id: null,
    };
    expect(canGrantVoluntaryCollabEndCredit(row, "u2")).toBe(true);
    expect(isCollabEndInstantExit(row)).toBe(true);
    expect(canGrantVoluntaryCollabEndCredit({ ...row, response_credit_outcome: "per_plan" }, "u2")).toBe(
      false,
    );
  });
});

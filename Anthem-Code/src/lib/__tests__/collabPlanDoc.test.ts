import { describe, expect, it } from "vitest";
import {
  collabStallDays,
  countCollabPlanProgress,
  emptyAlignPayload,
  emptyCollabPlanDocument,
  nextStepId,
  prevStepId,
  validateAlignRequired,
} from "@/lib/collabPlanDoc";

describe("validateAlignRequired", () => {
  it("requires only the idea and rights/credit", () => {
    const result = validateAlignRequired(emptyAlignPayload());
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["idea", "rights"]);
  });

  it("passes without due date or deliverables", () => {
    const align = emptyAlignPayload();
    align.idea = "ทำคอลแลปร่วมกัน";
    align.rights = "เครดิตทั้งคู่";
    expect(validateAlignRequired(align).ok).toBe(true);
  });
});

describe("quick mode", () => {
  it("walks all four steps by default", () => {
    expect(nextStepId("align")).toBe("create");
    expect(nextStepId("create")).toBe("review");
    expect(prevStepId("review")).toBe("create");
  });

  it("skips the create step in both directions", () => {
    expect(nextStepId("align", true)).toBe("review");
    expect(prevStepId("review", true)).toBe("align");
    expect(nextStepId("publish", true)).toBeNull();
  });

  it("counts progress out of three steps", () => {
    const doc = emptyCollabPlanDocument("c1");
    doc.payload.quick = true;
    doc.currentStep = "review";
    expect(countCollabPlanProgress(doc)).toEqual({ done: 1, total: 3 });
    doc.currentStep = "publish";
    doc.status = "step_locked";
    expect(countCollabPlanProgress(doc)).toEqual({ done: 3, total: 3 });
  });
});

describe("collabStallDays", () => {
  const now = Date.parse("2026-10-20T00:00:00Z");
  it("counts whole days since the last update", () => {
    expect(collabStallDays("2026-10-12T00:00:00Z", now)).toBe(8);
    expect(collabStallDays("2026-10-19T12:00:00Z", now)).toBe(0);
  });
  it("is 0 for invalid dates", () => {
    expect(collabStallDays("nope", now)).toBe(0);
  });
});

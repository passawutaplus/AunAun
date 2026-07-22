import { describe, expect, it } from "vitest";
import {
  emptyAlignPayload,
  validateAlignRequired,
} from "@/lib/collabPlanDoc";

describe("validateAlignRequired", () => {
  it("requires idea, due date, deliverables, and rights", () => {
    const align = emptyAlignPayload();
    const result = validateAlignRequired(align);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["idea", "dueAt", "deliverables", "rights"]);
  });

  it("passes when all required fields are filled", () => {
    const align = emptyAlignPayload();
    align.idea = "ทำคอลแลปร่วมกัน";
    align.dueAt = "2026-08-15";
    align.deliverableItems = ["โปสเตอร์", "", ""];
    align.rights = "เครดิตทั้งคู่";
    const result = validateAlignRequired(align);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("does not require optional release date", () => {
    const align = emptyAlignPayload();
    align.idea = "ทำคอลแลปร่วมกัน";
    align.dueAt = "2026-08-15";
    align.deliverableItems = ["โปสเตอร์", "", ""];
    align.rights = "เครดิตทั้งคู่";
    align.releaseAt = null;
    expect(validateAlignRequired(align).ok).toBe(true);
  });
});

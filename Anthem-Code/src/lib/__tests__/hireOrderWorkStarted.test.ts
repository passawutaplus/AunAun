import { describe, expect, it } from "vitest";
import { hireOrderWorkHasStarted } from "@/hooks/useHireOrderFlow";

describe("hireOrderWorkHasStarted", () => {
  it("is true after payment / delivery, false before pay", () => {
    expect(hireOrderWorkHasStarted("awaiting_payment")).toBe(false);
    expect(hireOrderWorkHasStarted("draft")).toBe(false);
    expect(hireOrderWorkHasStarted("paid_pending")).toBe(true);
    expect(hireOrderWorkHasStarted("in_progress")).toBe(true);
    expect(hireOrderWorkHasStarted("awaiting_approval")).toBe(true);
    expect(hireOrderWorkHasStarted(null)).toBe(false);
  });
});

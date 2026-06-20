import { describe, expect, it } from "vitest";
import { triageReport, kycRiskTone } from "@/lib/report-ai-triage";

describe("report-ai-triage", () => {
  it("ranks scam with evidence as urgent", () => {
    const r = triageReport({
      reason: "scam",
      target_type: "project",
      details: "x".repeat(350),
      evidence_count: 3,
    });
    expect(r.priority_score).toBeGreaterThanOrEqual(70);
    expect(r.recommendation).toBe("urgent");
  });

  it("ranks spam as routine", () => {
    const r = triageReport({ reason: "spam", target_type: "comment", details: "" });
    expect(r.recommendation).toBe("routine");
  });

  it("kycRiskTone thresholds", () => {
    expect(kycRiskTone(10)).toBe("low");
    expect(kycRiskTone(30)).toBe("medium");
    expect(kycRiskTone(55)).toBe("high");
  });
});

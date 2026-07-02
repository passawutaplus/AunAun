import { describe, expect, it } from "vitest";
import { mockAiOutput, runKuyAiTask } from "../prompts";

describe("mockAiOutput", () => {
  it("returns structured KuyAiOutput", () => {
    const out = mockAiOutput("analyze_lead_intent");
    expect(out.summary).toBeTruthy();
    expect(Array.isArray(out.keyFindings)).toBe(true);
    expect(out.keyFindings.length).toBeGreaterThan(0);
    expect(out.recommendedAction).toBeTruthy();
    expect(out.confidenceScore).toBeGreaterThan(0);
    expect(out.riskComplianceNote).toContain("100%");
  });
});

describe("runKuyAiTask", () => {
  it("resolves mock output", async () => {
    const out = await runKuyAiTask("generate_ads_plan", { business: "Beauty Clinic" }, "ads");
    expect(out.summary).toBeTruthy();
  });
});

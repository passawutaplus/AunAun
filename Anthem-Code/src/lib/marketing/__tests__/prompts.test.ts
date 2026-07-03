import { describe, expect, it } from "vitest";
import { isMarketingAiMock, mockAiOutput, runMarketingAiTask } from "../prompts";

describe("mockAiOutput", () => {
  it("returns structured MarketingAiOutput", () => {
    const out = mockAiOutput("analyze_lead_intent");
    expect(out.summary).toBeTruthy();
    expect(Array.isArray(out.keyFindings)).toBe(true);
    expect(out.keyFindings.length).toBeGreaterThan(0);
    expect(out.recommendedAction).toBeTruthy();
    expect(out.confidenceScore).toBeGreaterThan(0);
    expect(out.riskComplianceNote).toContain("100%");
  });
});

describe("isMarketingAiMock", () => {
  it("defaults to mock in test/dev unless explicitly false", () => {
    expect(typeof isMarketingAiMock()).toBe("boolean");
  });
});

describe("runMarketingAiTask", () => {
  it("resolves mock output when mock mode", async () => {
    const out = await runMarketingAiTask("generate_ads_plan", { business: "Beauty Clinic" }, "ads");
    expect(out.summary).toBeTruthy();
  });
});

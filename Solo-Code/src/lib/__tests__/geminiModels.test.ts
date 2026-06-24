import { describe, expect, it } from "vitest";
import {
  defaultFastModel,
  defaultVisionModel,
  geminiModelsConfig,
  normalizeGeminiModel,
} from "@/lib/geminiModels";

describe("geminiModels", () => {
  it("pins current vision model (not legacy 1.5)", () => {
    const vision = defaultVisionModel();
    expect(vision).toBe(geminiModelsConfig().models.vision);
    expect(vision).not.toMatch(/1\.5/);
  });

  it("maps legacy model ids via aliases", () => {
    expect(normalizeGeminiModel("gemini-1.5-flash")).toBe("gemini-3.5-flash");
    expect(normalizeGeminiModel("google/gemini-2.0-flash-lite")).toBe("gemini-3.1-flash-lite");
  });

  it("exposes config with all slots", () => {
    const cfg = geminiModelsConfig();
    expect(cfg.models.fast).toBeTruthy();
    expect(cfg.models.default).toBeTruthy();
    expect(cfg.models.vision).toBeTruthy();
    expect(defaultFastModel()).toBe(cfg.models.fast);
  });
});

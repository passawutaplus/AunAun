import { describe, expect, it } from "vitest";
import { getPresetConfig, isAssistantPreset, ASSISTANT_PRESETS } from "@/lib/aiAssistantPresets";

describe("aiAssistantPresets", () => {
  it("has four presets", () => {
    expect(ASSISTANT_PRESETS).toHaveLength(4);
  });

  it("getPresetConfig returns business config", () => {
    const cfg = getPresetConfig("business");
    expect(cfg.feature).toBe("ai_assistant_business");
    expect(cfg.cost).toBe(5);
    expect(cfg.usesBusinessSnapshot).toBe(true);
  });

  it("isAssistantPreset validates ids", () => {
    expect(isAssistantPreset("copy")).toBe(true);
    expect(isAssistantPreset("invalid")).toBe(false);
  });
});

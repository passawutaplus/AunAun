import { describe, expect, it, vi, afterEach } from "vitest";
import {
  coerceLaunchFeedMode,
  isAplus1LaunchMinimal,
  isAplus1PaymentsEnabled,
  isLaunchFeedMode,
  isLaunchHiddenPath,
  isSoloEcosystemEnabled,
} from "@/lib/aplus1Launch";

describe("aplus1Launch flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults both flags off when env unset", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_APLUS1_UPGRADE_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "");
    vi.stubEnv("PROD", "");
    vi.stubEnv("DEV", "true");
    expect(isAplus1LaunchMinimal()).toBe(false);
    expect(isSoloEcosystemEnabled()).toBe(false);
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("defaults payments on in production when env unset (non-demo)", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("DEV", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
    expect(isSoloEcosystemEnabled()).toBe(false);
  });

  it("respects VITE_APLUS1_PAYMENTS_ENABLED=false even on production", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "false");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("VITE_DEMO_MODE", "");
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("launch minimal disables payments even on production", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    vi.stubEnv("PROD", "true");
    expect(isAplus1LaunchMinimal()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("defaults payments on for demo production builds when env unset", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("DEV", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });

  it("enables payments when VITE_APLUS1_PAYMENTS_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
    expect(isSoloEcosystemEnabled()).toBe(false);
  });

  it("enables ecosystem and payments when VITE_SOLO_ECOSYSTEM_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    expect(isSoloEcosystemEnabled()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });

  it("restricts feed modes when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "true");
    expect(isLaunchFeedMode("projects")).toBe(true);
    expect(isLaunchFeedMode("designers")).toBe(true);
    expect(isLaunchFeedMode("community")).toBe(false);
    expect(coerceLaunchFeedMode("studios")).toBe("projects");
  });

  it("hides marketplace paths when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "true");
    expect(isLaunchHiddenPath("/jobs")).toBe(true);
    expect(isLaunchHiddenPath("/community/abc")).toBe(true);
    expect(isLaunchHiddenPath("/project/1")).toBe(false);
    expect(isLaunchHiddenPath("/chat")).toBe(false);
    expect(isLaunchHiddenPath("/admin")).toBe(false);
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isAplus1PaymentsEnabled,
  isSoloEcosystemEnabled,
} from "@/lib/aplus1Launch";

describe("aplus1Launch flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults both flags off when env unset", () => {
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_APLUS1_UPGRADE_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "");
    vi.stubEnv("PROD", "");
    vi.stubEnv("DEV", "true");
    expect(isSoloEcosystemEnabled()).toBe(false);
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("defaults payments on in production when env unset (non-demo)", () => {
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("DEV", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
    expect(isSoloEcosystemEnabled()).toBe(false);
  });

  it("respects VITE_APLUS1_PAYMENTS_ENABLED=false even on production", () => {
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "false");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("VITE_DEMO_MODE", "");
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("defaults payments on for demo production builds when env unset", () => {
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("PROD", "true");
    vi.stubEnv("DEV", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });

  it("enables payments when VITE_APLUS1_PAYMENTS_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    expect(isAplus1PaymentsEnabled()).toBe(true);
    expect(isSoloEcosystemEnabled()).toBe(false);
  });

  it("enables ecosystem and payments when VITE_SOLO_ECOSYSTEM_ENABLED=true", () => {
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    expect(isSoloEcosystemEnabled()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });
});

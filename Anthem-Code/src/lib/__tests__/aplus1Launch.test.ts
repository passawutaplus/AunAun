import { describe, expect, it, vi, afterEach } from "vitest";
import {
  coerceLaunchFeedMode,
  isAplus1FullProduct,
  isAplus1LaunchMinimal,
  isAplus1PaymentsEnabled,
  isAplus1SubscriptionsEnabled,
  isLaunchCreatorSupportEnabled,
  isLaunchDesignDrillEnabled,
  isLaunchBoostEnabled,
  isLaunchAllowedPath,
  isLaunchFeedMode,
  isLaunchHiddenPath,
  isSoloEcosystemEnabled,
} from "@/lib/aplus1Launch";

describe("aplus1Launch flags (fail-closed)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to launch minimal when env unset", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "");
    expect(isAplus1FullProduct()).toBe(false);
    expect(isAplus1LaunchMinimal()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(false);
    expect(isAplus1SubscriptionsEnabled()).toBe(false);
    expect(isLaunchCreatorSupportEnabled()).toBe(false);
    expect(isLaunchDesignDrillEnabled()).toBe(false);
    expect(isLaunchBoostEnabled()).toBe(false);
    expect(isSoloEcosystemEnabled()).toBe(false);
  });

  it("enables full product only with VITE_APLUS1_FULL_PRODUCT=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isAplus1LaunchMinimal()).toBe(false);
  });

  it("does not enable payments without explicit flag even in production", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "");
    vi.stubEnv("PROD", "true");
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("enables payments only when full product and VITE_APLUS1_PAYMENTS_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });

  it("enables subscriptions only when full product and VITE_APLUS1_SUBSCRIPTIONS_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_SUBSCRIPTIONS_ENABLED", "true");
    expect(isAplus1SubscriptionsEnabled()).toBe(true);
  });

  it("launch minimal always disables subscriptions", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_SUBSCRIPTIONS_ENABLED", "true");
    expect(isAplus1SubscriptionsEnabled()).toBe(false);
  });

  it("enables creator support only when full product and VITE_APLUS1_SUPPORT_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_SUPPORT_ENABLED", "true");
    expect(isLaunchCreatorSupportEnabled()).toBe(true);
  });

  it("launch minimal always disables creator support", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_SUPPORT_ENABLED", "true");
    expect(isLaunchCreatorSupportEnabled()).toBe(false);
  });

  it("enables design drill only when full product and VITE_APLUS1_DESIGN_DRILL_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_DESIGN_DRILL_ENABLED", "true");
    expect(isLaunchDesignDrillEnabled()).toBe(true);
  });

  it("launch minimal always disables design drill", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_DESIGN_DRILL_ENABLED", "true");
    expect(isLaunchDesignDrillEnabled()).toBe(false);
  });

  it("enables boost only when full product and VITE_APLUS1_BOOST_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_BOOST_ENABLED", "true");
    expect(isLaunchBoostEnabled()).toBe(true);
  });

  it("launch minimal always disables boost", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_BOOST_ENABLED", "true");
    expect(isLaunchBoostEnabled()).toBe(false);
  });

  it("launch minimal always disables payments", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("enables ecosystem only when full product and VITE_SOLO_ECOSYSTEM_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "false");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "true");
    expect(isSoloEcosystemEnabled()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(false);
  });

  it("restricts feed modes when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    expect(isLaunchFeedMode("projects")).toBe(true);
    expect(isLaunchFeedMode("designers")).toBe(true);
    expect(isLaunchFeedMode("community")).toBe(false);
    expect(coerceLaunchFeedMode("studios")).toBe("projects");
  });
});

describe("launch route allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
  });

  const allowed = [
    "/",
    "/auth",
    "/auth/forgot",
    "/portfolio",
    "/portfolio/new",
    "/portfolio/saved",
    "/project/abc-123",
    "/u/user-id",
    "/u/user-id/followers",
    "/explore/tool/Figma",
    "/chat",
    "/chat/conv-id",
    "/settings",
    "/notifications",
    "/collections",
    "/collections/col-id",
    "/legal/privacy",
    "/admin",
    "/admin/users",
    "/error/404",
    "/me/reports",
    "/me/feedback",
    "/@designer",
  ];

  const blocked = [
    "/jobs",
    "/jobs/abc",
    "/community",
    "/community/abc",
    "/advertise",
    "/upgrade",
    "/earnings",
    "/referrals",
    "/drill",
    "/studio/new",
    "/s/studio-slug",
    "/contracts",
    "/research",
    "/inspire/board",
    "/similar/proj",
    "/verify",
    "/ads/abc",
  ];

  it.each(allowed)("allows MVP path %s", (path) => {
    expect(isLaunchAllowedPath(path)).toBe(true);
    expect(isLaunchHiddenPath(path)).toBe(false);
  });

  it.each(blocked)("blocks non-MVP path %s", (path) => {
    expect(isLaunchAllowedPath(path)).toBe(false);
    expect(isLaunchHiddenPath(path)).toBe(true);
  });

  it("allows all paths when full product", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isLaunchHiddenPath("/jobs")).toBe(false);
    expect(isLaunchHiddenPath("/community/x")).toBe(false);
  });
});

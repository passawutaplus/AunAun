import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  coerceLaunchFeedMode,
  isAplus1FullProduct,
  isAplus1LaunchMinimal,
  isAplus1PaymentsEnabled,
  isAplus1ChatOffersEnabled,
  isAplus1SubscriptionsEnabled,
  isLaunchCreatorSupportEnabled,
  isAplus1GiftEconomyEnabled,
  isAplus1PxEnabled,
  isLaunchDesignDrillEnabled,
  isLaunchBoostEnabled,
  isLaunchAllowedPath,
  isLaunchFeedMode,
  isLaunchHiddenPath,
  isAplus1HiringBoardEnabled,
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
    expect(isAplus1ChatOffersEnabled()).toBe(true);
    expect(isAplus1SubscriptionsEnabled()).toBe(false);
    expect(isLaunchCreatorSupportEnabled()).toBe(false);
    expect(isAplus1PxEnabled()).toBe(false);
    expect(isAplus1GiftEconomyEnabled()).toBe(false);
    expect(isLaunchDesignDrillEnabled()).toBe(false);
    expect(isLaunchBoostEnabled()).toBe(false);
    expect(isAplus1HiringBoardEnabled()).toBe(false);
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

  it("chat offers default on for hire-chat testing", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_CHAT_OFFERS_ENABLED", "");
    expect(isAplus1ChatOffersEnabled()).toBe(true);
  });

  it("disables chat offers when explicitly false even with full product", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_CHAT_OFFERS_ENABLED", "false");
    expect(isAplus1ChatOffersEnabled()).toBe(false);
  });

  it("enables chat offers with explicit flag when full product", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_CHAT_OFFERS_ENABLED", "true");
    expect(isAplus1ChatOffersEnabled()).toBe(true);
  });

  it("enables chat offers with explicit flag in launch minimal for testing", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_LAUNCH_MINIMAL", "true");
    vi.stubEnv("VITE_APLUS1_CHAT_OFFERS_ENABLED", "true");
    expect(isAplus1ChatOffersEnabled()).toBe(true);
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

  it("enables Pixel only when full product and VITE_APLUS1_PX_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PX_ENABLED", "true");
    expect(isAplus1PxEnabled()).toBe(true);
    expect(isAplus1GiftEconomyEnabled()).toBe(false);
  });

  it("launch minimal always disables Pixel", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_PX_ENABLED", "true");
    expect(isAplus1PxEnabled()).toBe(false);
  });

  it("enables creator support / gift economy only when Pixel and gift flags are on", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PX_ENABLED", "true");
    vi.stubEnv("VITE_APLUS1_GIFT_ECONOMY_ENABLED", "true");
    expect(isLaunchCreatorSupportEnabled()).toBe(true);
    expect(isAplus1GiftEconomyEnabled()).toBe(true);
  });

  it("gift economy stays off when Pixel is off even if gift flag is set", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PX_ENABLED", "");
    vi.stubEnv("VITE_APLUS1_GIFT_ECONOMY_ENABLED", "true");
    expect(isAplus1PxEnabled()).toBe(false);
    expect(isAplus1GiftEconomyEnabled()).toBe(false);
    expect(isLaunchCreatorSupportEnabled()).toBe(false);
  });

  it("launch minimal always disables creator support / gift economy", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    vi.stubEnv("VITE_APLUS1_GIFT_ECONOMY_ENABLED", "true");
    expect(isLaunchCreatorSupportEnabled()).toBe(false);
    expect(isAplus1GiftEconomyEnabled()).toBe(false);
  });

  it("gift economy stays off when full product but flag unset", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_GIFT_ECONOMY_ENABLED", "");
    expect(isAplus1GiftEconomyEnabled()).toBe(false);
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

  it("enables hiring board only with VITE_APLUS1_HIRING_BOARD_ENABLED=true", () => {
    vi.stubEnv("VITE_APLUS1_HIRING_BOARD_ENABLED", "true");
    expect(isAplus1HiringBoardEnabled()).toBe(true);
    expect(isLaunchAllowedPath("/hiring")).toBe(true);
    expect(isLaunchHiddenPath("/hiring/new")).toBe(false);
    expect(isLaunchHiddenPath("/org/register")).toBe(false);
  });

  it("keeps hiring board off when flag unset even in full product", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_HIRING_BOARD_ENABLED", "");
    expect(isAplus1HiringBoardEnabled()).toBe(false);
    expect(isLaunchHiddenPath("/hiring")).toBe(true);
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

  it("restricts feed modes even when full product", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isLaunchFeedMode("projects")).toBe(true);
    expect(isLaunchFeedMode("objects")).toBe(true);
    expect(isLaunchFeedMode("community")).toBe(false);
    expect(isLaunchFeedMode("studios")).toBe(false);
    expect(coerceLaunchFeedMode("community")).toBe("projects");
    expect(coerceLaunchFeedMode("studios")).toBe("projects");
  });

  it("restricts feed modes when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    expect(isLaunchFeedMode("projects")).toBe(true);
    expect(isLaunchFeedMode("designers")).toBe(true);
    expect(isLaunchFeedMode("packages")).toBe(true);
    expect(isLaunchFeedMode("objects")).toBe(true);
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
    "/service/svc-123",
    "/object/sample-print",
    "/u/user-id",
    "/u/user-id/followers",
    "/explore/tool/Figma",
    "/chat",
    "/chat/conv-id",
    "/settings",
    "/notifications",
    "/collections",
    "/collections/col-id",
    "/series",
    "/series/ser-id",
    "/legal/privacy",
    "/admin",
    "/admin/users",
    "/error/404",
    "/me/reports",
    "/me/feedback",
    "/@designer",
    "/similar/proj",
    "/inspire",
    "/inspire/board",
    "/hire/start",
    "/verify",
    "/earnings",
    "/earnings/withdraw",
    "/earnings/withdraw/pin",
    "/dashboard",
    "/dashboard/hire",
    "/dashboard/collab",
    "/dashboard/projects",
    "/dashboard/packages",
    "/dashboard/objects",
    "/dashboard/catalogs",
    "/dashboard/reviews",
    "/dashboard/documents",
    "/dashboard/payout",
  ];

  const blocked = [
    "/jobs",
    "/jobs/abc",
    "/jobs/new",
    "/hiring",
    "/hiring/abc",
    "/hiring/new",
    "/org/register",
    "/org/status",
    "/community",
    "/community/abc",
    "/advertise",
    "/upgrade",
    "/referrals",
    "/drill",
    "/studio/new",
    "/s/studio-slug",
    "/contracts",
    "/research",
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

  it("allows remaining full-product paths but keeps Area and Studio retired", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isLaunchHiddenPath("/jobs")).toBe(true);
    expect(isLaunchHiddenPath("/hiring")).toBe(true);
    expect(isLaunchHiddenPath("/org/register")).toBe(true);
    expect(isLaunchHiddenPath("/community/x")).toBe(true);
    expect(isLaunchHiddenPath("/studio/new")).toBe(true);
    expect(isLaunchHiddenPath("/s/studio-slug")).toBe(true);
  });

  it("does not treat unknown URLs as coming-soon (real 404)", () => {
    expect(isLaunchAllowedPath("/this-page-does-not-exist")).toBe(false);
    expect(isLaunchHiddenPath("/this-page-does-not-exist")).toBe(false);
    expect(isLaunchHiddenPath("/totally/missing/path")).toBe(false);
  });
});

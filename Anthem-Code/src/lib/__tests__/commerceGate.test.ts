import { afterEach, describe, expect, it, vi } from "vitest";
import {
  coerceLaunchFeedMode,
  isCommerceEnabled,
  isCommercePath,
  isFeedModeVisible,
  isLaunchHiddenPath,
} from "@/lib/aplus1Launch";
import { matchStudioItem, studioNavGroups } from "@/lib/studioNav";

describe("free launch: commerce gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off unless explicitly enabled", () => {
    vi.stubEnv("VITE_SAMECOR_COMMERCE_ENABLED", "");
    expect(isCommerceEnabled()).toBe(false);
    vi.stubEnv("VITE_SAMECOR_COMMERCE_ENABLED", "true");
    expect(isCommerceEnabled()).toBe(true);
  });

  it.each([
    "/earnings",
    "/earnings/withdraw",
    "/earnings/withdraw/pin",
    "/dashboard/payout",
    "/dashboard/documents",
    "/dashboard/packages",
    "/dashboard/objects",
    "/portfolio/packages/new",
    "/portfolio/packages/abc/edit",
    "/service/abc",
    "/object/abc",
    "/contracts",
    "/forum",
    "/forum/new",
  ])("hides %s while off, even in full product", (path) => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isCommercePath(path)).toBe(true);
    expect(isLaunchHiddenPath(path)).toBe(true);
  });

  it.each(["/", "/portfolio", "/dashboard", "/dashboard/projects", "/dashboard/catalogs", "/dashboard/hire", "/chat", "/u/abc", "/project/abc"])(
    "keeps %s open",
    (path) => {
      expect(isCommercePath(path)).toBe(false);
    },
  );

  it("drops Packages and Objects from the feed while off", () => {
    expect(isFeedModeVisible("projects")).toBe(true);
    expect(isFeedModeVisible("designers")).toBe(true);
    expect(isFeedModeVisible("packages")).toBe(false);
    expect(coerceLaunchFeedMode("objects")).toBe("projects");
    vi.stubEnv("VITE_SAMECOR_COMMERCE_ENABLED", "true");
    expect(isFeedModeVisible("packages")).toBe(true);
  });

  it("removes finance, Packages and Objects from the studio sidebar while off", () => {
    const groups = studioNavGroups();
    expect(groups.some((g) => g.id === "finance")).toBe(false);
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual(expect.arrayContaining(["projects", "catalogs"]));
    expect(ids).not.toContain("packages");
    expect(ids).not.toContain("objects");
    expect(matchStudioItem("/earnings")).toBeUndefined();
  });
});

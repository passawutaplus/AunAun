import { describe, expect, it } from "vitest";
import { isStudioPath, matchStudioItem, studioNavItems } from "@/lib/studioNav";

describe("studio nav", () => {
  it("has unique paths for every My Studio page", () => {
    const paths = studioNavItems().map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("matches work and finance routes exactly", () => {
    expect(matchStudioItem("/dashboard/projects")?.id).toBe("projects");
    expect(matchStudioItem("/dashboard/packages")?.id).toBe("packages");
    expect(matchStudioItem("/dashboard/objects")?.id).toBe("objects");
    expect(matchStudioItem("/dashboard/catalogs")?.id).toBe("catalogs");
    expect(matchStudioItem("/dashboard")?.id).toBe("home");
    expect(matchStudioItem("/dashboard")?.label).toBe("Dashboard");
    expect(matchStudioItem("/dashboard")?.heroTitle).toBe("Dashboard");
    expect(matchStudioItem("/dashboard/hire")?.id).toBe("work");
    expect(matchStudioItem("/dashboard/hire")?.label).toBe("จ้างงาน");
    expect(matchStudioItem("/dashboard/hire")?.heroTitle).toBe("Hire");
    expect(matchStudioItem("/dashboard/collab")?.id).toBe("collab");
    expect(matchStudioItem("/dashboard/reviews")?.id).toBe("reviews");
    expect(matchStudioItem("/earnings")?.id).toBe("transactions");
    expect(matchStudioItem("/earnings/withdraw")?.id).toBe("withdraw");
    expect(matchStudioItem("/earnings/withdraw/pin")?.id).toBe("withdraw-pin");
    expect(matchStudioItem("/earnings/withdraw/pin")?.label).toBe("ถอนเงิน");
    expect(matchStudioItem("/dashboard/documents")?.id).toBe("documents");
    expect(matchStudioItem("/dashboard/documents")?.label).toBe("เอกสาร / ภาษี");
    expect(matchStudioItem("/dashboard/payout")?.id).toBe("payout");
  });

  it("does not treat earnings withdraw as the transactions item", () => {
    expect(matchStudioItem("/earnings/withdraw")?.to).toBe("/earnings/withdraw");
  });

  it("recognizes studio path prefixes", () => {
    expect(isStudioPath("/dashboard")).toBe(true);
    expect(isStudioPath("/dashboard/hire")).toBe(true);
    expect(isStudioPath("/dashboard/payout")).toBe(true);
    expect(isStudioPath("/earnings/withdraw")).toBe(true);
    expect(isStudioPath("/settings")).toBe(false);
  });
});

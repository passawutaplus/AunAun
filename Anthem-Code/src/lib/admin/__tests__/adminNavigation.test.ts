import { describe, expect, it, vi, afterEach } from "vitest";
import {
  adminNavSectionsForBuild,
  adminSidebarSections,
  isAdminLaunchHiddenPath,
} from "@/lib/admin/adminNavigation";

describe("adminNavigation launch minimal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not hide core admin paths when full product is enabled", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    expect(isAdminLaunchHiddenPath("/admin/jobs")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin/projects")).toBe(false);
  });

  it("hides marketplace and growth admin paths when launch minimal (default)", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    expect(isAdminLaunchHiddenPath("/admin/jobs")).toBe(true);
    expect(isAdminLaunchHiddenPath("/admin/marketing")).toBe(true);
    expect(isAdminLaunchHiddenPath("/admin/data")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin/wallet")).toBe(true);
    expect(isAdminLaunchHiddenPath("/admin/projects")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin/chats")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin")).toBe(false);
  });

  it("filters sidebar sections when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    const paths = adminSidebarSections().flatMap((s) => s.items.map((i) => i.to));
    expect(paths).not.toContain("/admin/marketing");
    expect(paths).not.toContain("/admin/jobs");
    expect(paths).toContain("/admin/data");
    expect(paths).toContain("/admin/insights");
    expect(paths).toContain("/admin/projects");
    expect(paths).toContain("/admin/chats");
    expect(paths).toContain("/admin/compliance");
    expect(paths).toContain("/admin/storage");
  });

  it("overview sections exclude hidden items when launch minimal", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    const sectionIds = adminNavSectionsForBuild().map((s) => s.id);
    expect(sectionIds).not.toContain("marketplace");
    expect(sectionIds).not.toContain("money");
    expect(sectionIds).toContain("content");
    expect(sectionIds).toContain("trust");
  });
});

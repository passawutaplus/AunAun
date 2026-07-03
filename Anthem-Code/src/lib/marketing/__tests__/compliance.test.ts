import { describe, expect, it } from "vitest";
import { assertExportAllowed, assertSourceUrl, ExportComplianceError, isInternalLead } from "../compliance";

describe("assertExportAllowed", () => {
  it("throws when compliance not confirmed", () => {
    expect(() => assertExportAllowed(false, true)).toThrow(ExportComplianceError);
  });

  it("throws when source URLs missing", () => {
    expect(() => assertExportAllowed(true, false)).toThrow(ExportComplianceError);
  });

  it("passes when confirmed and URLs present", () => {
    expect(() => assertExportAllowed(true, true)).not.toThrow();
  });
});

describe("assertSourceUrl", () => {
  it("requires http(s) URL", () => {
    expect(() => assertSourceUrl("")).toThrow();
    expect(() => assertSourceUrl("ftp://x.com")).toThrow();
    expect(assertSourceUrl("https://example.com/post/1")).toBe("https://example.com/post/1");
  });

  it("allows admin URLs when internal", () => {
    expect(assertSourceUrl("https://aplus1.app/admin/users?user_id=x", { internal: true })).toContain(
      "/admin/users",
    );
  });

  it("blocks admin URLs for external leads", () => {
    expect(() => assertSourceUrl("https://aplus1.app/admin/users?user_id=x")).toThrow();
  });
});

describe("isInternalLead", () => {
  it("detects internal origin or tag", () => {
    expect(isInternalLead({ lead_origin: "internal" })).toBe(true);
    expect(isInternalLead({ tags: ["internal", "creator"] })).toBe(true);
    expect(isInternalLead({ lead_origin: "external", tags: [] })).toBe(false);
  });
});

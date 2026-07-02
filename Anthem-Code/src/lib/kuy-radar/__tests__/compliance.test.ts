import { describe, expect, it } from "vitest";
import { assertExportAllowed, assertSourceUrl, ExportComplianceError } from "../compliance";

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
});

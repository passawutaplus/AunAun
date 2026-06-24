import { describe, it, expect } from "vitest";
import { safeRelativePath, safeHttpUrl } from "../safeUrl";

describe("safeRelativePath", () => {
  it("accepts simple paths", () => {
    expect(safeRelativePath("/dashboard")).toBe("/dashboard");
    expect(safeRelativePath("/users/123?tab=settings")).toBe("/users/123?tab=settings");
  });
  it("blocks protocol-relative URLs", () => {
    expect(safeRelativePath("//evil.com")).toBe("/");
    expect(safeRelativePath("//evil.com/path", "/safe")).toBe("/safe");
  });
  it("blocks backslash variants", () => {
    expect(safeRelativePath("/\\evil.com")).toBe("/");
  });
  it("blocks URL-encoded protocol-relative", () => {
    expect(safeRelativePath("/%2fevil.com")).toBe("/");
    expect(safeRelativePath("/%5cevil.com")).toBe("/");
  });
  it("blocks scheme injection", () => {
    expect(safeRelativePath("/javascript:alert(1)")).toBe("/");
  });
  it("returns fallback on falsy", () => {
    expect(safeRelativePath(null)).toBe("/");
    expect(safeRelativePath(undefined)).toBe("/");
    expect(safeRelativePath("")).toBe("/");
    expect(safeRelativePath("relative")).toBe("/");
  });
  it("custom fallback", () => {
    expect(safeRelativePath(null, "/login")).toBe("/login");
  });
});

describe("safeHttpUrl", () => {
  it("accepts http(s)", () => {
    expect(safeHttpUrl("https://example.com")).toContain("https://example.com");
  });
  it("rejects javascript: + data:", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>1</script>")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { safeHttpUrl, safeRelativePath } from "../safeUrl";

describe("safeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
    expect(safeHttpUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("rejects dangerous schemes", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("data:text/html,<script>")).toBeUndefined();
    expect(safeHttpUrl("file:///etc/passwd")).toBeUndefined();
    expect(safeHttpUrl("vbscript:msgbox()")).toBeUndefined();
  });

  it("rejects empty/invalid", () => {
    expect(safeHttpUrl("")).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
    expect(safeHttpUrl("not a url")).toBeUndefined();
    expect(safeHttpUrl("   ")).toBeUndefined();
  });
});

describe("safeRelativePath", () => {
  it("accepts single-slash same-origin paths", () => {
    expect(safeRelativePath("/dashboard")).toBe("/dashboard");
    expect(safeRelativePath("/a/b?x=1")).toBe("/a/b?x=1");
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeRelativePath("//evil.com")).toBe("/");
    expect(safeRelativePath("/\\evil.com")).toBe("/");
    expect(safeRelativePath("/%2fevil.com")).toBe("/");
    expect(safeRelativePath("https://evil.com")).toBe("/");
    expect(safeRelativePath("/javascript:alert(1)")).toBe("/");
    expect(safeRelativePath("javascript:alert(1)")).toBe("/");
  });

  it("uses fallback on empty", () => {
    expect(safeRelativePath("", "/home")).toBe("/home");
    expect(safeRelativePath(null)).toBe("/");
  });
});

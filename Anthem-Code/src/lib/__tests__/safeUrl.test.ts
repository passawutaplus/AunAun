import { describe, it, expect } from "vitest";
import { safeHttpUrl, safeRelativePath, socialDisplayId } from "../safeUrl";

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
    expect(safeRelativePath("/settings?recover=pin#account")).toBe("/settings?recover=pin#account");
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

describe("socialDisplayId", () => {
  it("keeps a bare handle", () => {
    expect(socialDisplayId("passawut123")).toBe("passawut123");
    expect(socialDisplayId("@passawut123")).toBe("passawut123");
  });

  it("strips host from Instagram and Facebook URLs", () => {
    expect(socialDisplayId("instagram.com/passawut123")).toBe("passawut123");
    expect(socialDisplayId("https://www.instagram.com/passawut123/")).toBe("passawut123");
    expect(socialDisplayId("www.facebook.com/so.good.12720")).toBe("so.good.12720");
    expect(socialDisplayId("https://www.facebook.com/so.good.12720")).toBe("so.good.12720");
  });

  it("uses Facebook profile id when there is no vanity path", () => {
    expect(socialDisplayId("https://www.facebook.com/profile.php?id=100012345")).toBe("100012345");
  });
});

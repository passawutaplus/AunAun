import { describe, expect, it } from "vitest";
import { safeRelativePath, shouldStripRedirectParam, formatOAuthCallbackError } from "../oauthRedirect";

describe("safeRelativePath", () => {
  it("allows same-origin paths", () => {
    expect(safeRelativePath("/dashboard")).toBe("/dashboard");
    expect(safeRelativePath("/a/b?x=1")).toBe("/a/b?x=1");
  });

  it("blocks open redirects", () => {
    expect(safeRelativePath("//evil.com")).toBe("/");
    expect(safeRelativePath("https://evil.com")).toBe("/");
    expect(safeRelativePath("/\\evil.com")).toBe("/");
    expect(safeRelativePath("/%2fevil.com")).toBe("/");
    expect(safeRelativePath("/javascript:alert(1)")).toBe("/");
  });
});

describe("formatOAuthCallbackError", () => {
  it("explains stale PKCE / back-button failures", () => {
    expect(formatOAuthCallbackError("PKCE code verifier not found")).toContain("กดย้อนกลับ");
    expect(formatOAuthCallbackError("network error")).toBe("network error");
  });
});

describe("shouldStripRedirectParam", () => {
  it("returns false for safe or missing values", () => {
    expect(shouldStripRedirectParam(null)).toBe(false);
    expect(shouldStripRedirectParam("/chat")).toBe(false);
  });

  it("returns true for unsafe redirect params", () => {
    expect(shouldStripRedirectParam("//evil.com")).toBe(true);
    expect(shouldStripRedirectParam("https://evil.com")).toBe(true);
  });
});

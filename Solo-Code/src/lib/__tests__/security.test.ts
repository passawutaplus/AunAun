import { describe, it, expect } from "vitest";
import {
  safeUrl,
  safeHref,
  safeNumber,
  escapeCSV,
  sanitizeText,
  toClientError,
  throwClientError,
  GENERIC_CLIENT_ERROR,
} from "../security";

describe("safeUrl", () => {
  it("accepts http(s)", () => {
    expect(safeUrl("https://example.com/")).toContain("https://example.com");
    expect(safeUrl("http://example.com/foo")).toContain("http://example.com");
  });
  it("blocks dangerous schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(safeUrl("vbscript:msgbox")).toBeNull();
    expect(safeUrl("file:///etc/passwd")).toBeNull();
  });
  it("returns null on garbage", () => {
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
});

describe("safeHref", () => {
  it("allows root-relative paths", () => {
    expect(safeHref("/dashboard")).toBe("/dashboard");
    expect(safeHref("/users/123")).toBe("/users/123");
  });
  it("blocks protocol-relative (open redirect)", () => {
    expect(safeHref("//evil.com")).toBeNull();
  });
  it("accepts safe absolute URLs", () => {
    expect(safeHref("https://example.com")).toContain("https://example.com");
  });
  it("blocks javascript: even when looks like path", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
  });
  it("handles null/undefined", () => {
    expect(safeHref(null)).toBeNull();
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});

describe("safeNumber", () => {
  it("parses valid numbers within bounds", () => {
    expect(safeNumber("123")).toBe(123);
    expect(safeNumber(45.6)).toBe(45.6);
    expect(safeNumber("1,234")).toBe(1234);
  });
  it("rejects NaN and Infinity", () => {
    expect(safeNumber("abc")).toBeNull();
    expect(safeNumber(Infinity)).toBeNull();
  });
  it("respects min/max", () => {
    expect(safeNumber(5, { min: 10 })).toBeNull();
    expect(safeNumber(100, { max: 50 })).toBeNull();
    expect(safeNumber(20, { min: 10, max: 50 })).toBe(20);
  });
});

describe("escapeCSV", () => {
  it("escapes formula injection prefixes", () => {
    expect(escapeCSV("=1+1")).toContain("'=1+1");
    expect(escapeCSV("+SUM(A1)")).toContain("'+SUM(A1)");
    expect(escapeCSV("-cmd|")).toContain("'-cmd|");
    expect(escapeCSV("@import")).toContain("'@import");
  });
  it("quotes values with commas / quotes / newlines", () => {
    expect(escapeCSV("a,b")).toBe('"a,b"');
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
  });
  it("passes safe values through", () => {
    expect(escapeCSV("hello")).toBe("hello");
    expect(escapeCSV(42)).toBe("42");
  });
});

describe("toClientError", () => {
  it("returns fallback and never leaks internal messages", () => {
    expect(toClientError(new Error("column profiles.secret does not exist"))).toBe(
      GENERIC_CLIENT_ERROR,
    );
    expect(toClientError("raw", "custom")).toBe("custom");
  });
});

describe("throwClientError", () => {
  it("throws sanitized message", () => {
    expect(() => throwClientError("test", new Error("secret db detail"), "safe")).toThrow("safe");
  });
});

describe("sanitizeText", () => {
  it("strips control chars", () => {
    expect(sanitizeText("a\u0000b\u0001c")).toBe("abc");
  });
  it("strips angle brackets", () => {
    expect(sanitizeText("<script>x</script>")).toBe("scriptx/script");
  });
  it("trims and truncates", () => {
    expect(sanitizeText("  hi  ")).toBe("hi");
    expect(sanitizeText("a".repeat(300), 100)).toHaveLength(100);
  });
});

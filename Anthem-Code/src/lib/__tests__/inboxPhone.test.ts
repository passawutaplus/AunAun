import { describe, expect, it } from "vitest";
import { normalizeInboxPhone, parseInboxPhone } from "@/lib/inboxPhone";

describe("normalizeInboxPhone", () => {
  it("strips dashes and spaces", () => {
    expect(normalizeInboxPhone("081-234-5678")).toBe("0812345678");
    expect(normalizeInboxPhone("081 234 5678")).toBe("0812345678");
  });

  it("keeps +66 mobiles", () => {
    expect(normalizeInboxPhone("+66 81 234 5678")).toBe("+66812345678");
  });
});

describe("parseInboxPhone", () => {
  it("allows empty to clear", () => {
    expect(parseInboxPhone("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts Thai mobiles", () => {
    expect(parseInboxPhone("081-234-5678")).toEqual({ ok: true, value: "0812345678" });
    expect(parseInboxPhone("+66812345678")).toEqual({ ok: true, value: "+66812345678" });
  });

  it("rejects invalid numbers", () => {
    expect(parseInboxPhone("123")).toEqual({ ok: false, error: "เบอร์โทรไทยไม่ถูกต้อง" });
    expect(parseInboxPhone("0512345678")).toEqual({ ok: false, error: "เบอร์โทรไทยไม่ถูกต้อง" });
  });
});

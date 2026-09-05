import { describe, expect, it } from "vitest";
import {
  isValidHiringEmail,
  isValidHiringPhone,
  normalizeSocialUrl,
  parseSocialLinks,
  hiringPostCta,
  postingGate,
} from "@/lib/hiringOrg";
import { isValidThaiTaxId } from "@/lib/chatOffer";

describe("hiring org helpers", () => {
  it("parses social links and drops empty urls", () => {
    expect(
      parseSocialLinks([
        { kind: "instagram", url: "https://instagram.com/studio" },
        { kind: "website", url: "  " },
        { kind: "nope", url: "https://example.com" },
      ]),
    ).toEqual([
      { kind: "instagram", url: "https://instagram.com/studio", label: undefined },
      { kind: "other", url: "https://example.com", label: undefined },
    ]);
  });

  it("normalizes social urls", () => {
    expect(normalizeSocialUrl("@brand")).toBe("https://www.instagram.com/brand");
    expect(normalizeSocialUrl("example.com")).toMatch(/^https:\/\/example\.com\/?$/);
    expect(normalizeSocialUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("validates email, phone, and tax id", () => {
    expect(isValidHiringEmail("hr@studio.co")).toBe(true);
    expect(isValidHiringEmail("bad")).toBe(false);
    expect(isValidHiringPhone("02-123-4567")).toBe(true);
    expect(isValidHiringPhone("123")).toBe(false);
    expect(isValidThaiTaxId("123")).toBe(false);
    expect(isValidThaiTaxId("")).toBe(false);
  });

  it("gates posting until a juristic org is approved", () => {
    expect(postingGate(undefined).kind).toBe("register");
    expect(postingGate([]).kind).toBe("register");
    expect(postingGate([{ status: "pending" }]).kind).toBe("pending");
    expect(postingGate([{ status: "needs_info" }]).kind).toBe("pending");
    expect(postingGate([{ status: "suspended" }]).kind).toBe("pending");
    expect(postingGate([{ status: "approved" }]).kind).toBe("ready");
    expect(postingGate([{ status: "pending" }, { status: "approved" }]).kind).toBe("ready");
  });

  it("labels the profile post button from org status", () => {
    expect(hiringPostCta(undefined)).toEqual({ label: "ลงประกาศ", to: "/org/register" });
    expect(hiringPostCta([{ status: "pending" }])).toEqual({ label: "กำลังตรวจสอบ", to: "/org/status" });
    expect(hiringPostCta([{ status: "needs_info" }])).toEqual({ label: "ต้องส่งข้อมูลเพิ่ม", to: "/org/status" });
    expect(hiringPostCta([{ status: "approved" }])).toEqual({ label: "ลงประกาศ", to: "/hiring/new" });
    expect(hiringPostCta([{ status: "suspended" }])).toEqual({ label: "ถูกระงับ", to: null });
    expect(hiringPostCta([{ status: "pending" }, { status: "approved" }]).to).toBe("/hiring/new");
  });
});

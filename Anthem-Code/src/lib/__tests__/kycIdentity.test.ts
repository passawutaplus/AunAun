import { describe, expect, it } from "vitest";
import {
  ageFromDateOfBirth,
  isAdultDateOfBirth,
  isKycExpired,
  isValidThaiNationalId,
  isValidThaiPhone,
} from "@/lib/kycIdentity";

describe("kycIdentity", () => {
  it("validates Thai national ID checksum", () => {
    expect(isValidThaiNationalId("1234567890121")).toBe(true);
    expect(isValidThaiNationalId("1234567890120")).toBe(false);
    expect(isValidThaiNationalId("123")).toBe(false);
  });

  it("validates Thai phone", () => {
    expect(isValidThaiPhone("0812345678")).toBe(true);
    expect(isValidThaiPhone("123")).toBe(false);
  });

  it("validates laser code", async () => {
    const { isValidThaiIdLaserCode, formatThaiIdLaserCode } = await import("@/lib/kycIdentity");
    expect(formatThaiIdLaserCode("jt0123456789")).toBe("JT0-1234567-89");
    expect(isValidThaiIdLaserCode("JT0-1234567-89")).toBe(true);
    expect(isValidThaiIdLaserCode("123")).toBe(false);
  });

  it("enforces adult DOB", () => {
    const now = new Date("2026-07-24");
    expect(ageFromDateOfBirth("2000-01-01", now)).toBe(26);
    expect(isAdultDateOfBirth("2008-07-24")).toBe(true);
    expect(isAdultDateOfBirth("2010-07-25")).toBe(false);
  });

  it("detects KYC expiry", () => {
    expect(isKycExpired("2020-01-01T00:00:00Z", new Date("2026-07-24"))).toBe(true);
    expect(isKycExpired("2030-01-01T00:00:00Z", new Date("2026-07-24"))).toBe(false);
    expect(isKycExpired(null)).toBe(false);
  });
});

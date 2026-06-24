import { describe, it, expect } from "vitest";
import {
  assertAllowedPaymentRedirectUrl,
  getAllowedPaymentRedirectOrigins,
  parseClientCheckoutApiBody,
} from "../paymentsApiValidation";

describe("assertAllowedPaymentRedirectUrl", () => {
  it("allows canonical production origin", () => {
    expect(assertAllowedPaymentRedirectUrl("https://solofreelancer.com/dashboard?ok=1")).toContain(
      "solofreelancer.com",
    );
  });

  it("allows localhost in dev", () => {
    expect(assertAllowedPaymentRedirectUrl("http://localhost:5173/pricing")).toContain("localhost");
  });

  it("blocks external open redirect", () => {
    expect(() => assertAllowedPaymentRedirectUrl("https://evil.com/phish")).toThrow(/not allowed/i);
  });

  it("blocks javascript scheme", () => {
    expect(() => assertAllowedPaymentRedirectUrl("javascript:alert(1)")).toThrow();
  });
});

describe("getAllowedPaymentRedirectOrigins", () => {
  it("includes static production origins", () => {
    const origins = getAllowedPaymentRedirectOrigins();
    expect(origins).toContain("https://solofreelancer.com");
    expect(origins).toContain("https://an1hem.app");
    expect(origins).toContain("https://1px-demo.vercel.app");
  });
});

describe("assertAllowedPaymentRedirectUrl — an1hem", () => {
  it("allows an1hem earnings return URL", () => {
    expect(assertAllowedPaymentRedirectUrl("https://an1hem.app/earnings?topup=success")).toContain(
      "an1hem.app",
    );
  });

  it("allows 1px-demo vercel preview", () => {
    expect(
      assertAllowedPaymentRedirectUrl("https://1px-demo-abc123.vercel.app/earnings?topup=success"),
    ).toContain("vercel.app");
  });
});

describe("parseClientCheckoutApiBody", () => {
  it("accepts minimal client checkout payload", () => {
    const parsed = parseClientCheckoutApiBody({
      token: "550e8400-e29b-41d4-a716-446655440000",
      paymentType: "deposit",
    });
    expect(parsed.paymentType).toBe("deposit");
  });

  it("rejects invalid payment type", () => {
    expect(() =>
      parseClientCheckoutApiBody({
        token: "550e8400-e29b-41d4-a716-446655440000",
        paymentType: "partial",
      }),
    ).toThrow();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupportPayee, isClosedError, isSupportPayOpen, supportQrPayload } from "@/lib/support/payment";

afterEach(() => {
  vi.unstubAllEnvs();
});

const ID = "004000000000001";

function stubPayee() {
  vi.stubEnv("VITE_SUPPORT_PROMPTPAY_ID", ID);
  vi.stubEnv("VITE_SUPPORT_ACCOUNT_NAME", "Test Payee");
  vi.stubEnv("VITE_SUPPORT_ACCOUNT_NO", "111-1-11111-1");
}

describe("support payment", () => {
  it("has no payee and stays closed with nothing set", () => {
    expect(getSupportPayee()).toBeNull();
    expect(isSupportPayOpen()).toBe(false);
  });

  it("opens real payment only when the space is on, not in test mode, and a payee is set", () => {
    stubPayee();
    expect(isSupportPayOpen()).toBe(false);
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    expect(isSupportPayOpen()).toBe(true);
    expect(getSupportPayee()).toMatchObject({ promptPayId: ID, accountName: "Test Payee", bank: "กสิกรไทย" });
    vi.stubEnv("VITE_SUPPORT_DEMO", "true");
    expect(isSupportPayOpen()).toBe(false);
  });

  it("ignores an id that is not a PromptPay target", () => {
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    vi.stubEnv("VITE_SUPPORT_PROMPTPAY_ID", "12345");
    vi.stubEnv("VITE_SUPPORT_ACCOUNT_NAME", "Test Payee");
    expect(getSupportPayee()).toBeNull();
    expect(isSupportPayOpen()).toBe(false);
  });

  it("uses a sample payee in test mode when none is set", () => {
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    vi.stubEnv("VITE_SUPPORT_DEMO", "true");
    expect(getSupportPayee()?.accountName).toContain("ตัวอย่าง");
  });

  it("builds a fixed-amount QR for the payee", () => {
    stubPayee();
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    const payload = supportQrPayload(getSupportPayee()!, 99)!;
    expect(payload).toContain(`0315${ID}`);
    expect(payload).toContain("010212");
    expect(payload).toContain("540599.00");
  });

  it("spots the server's CLOSED refusal", () => {
    expect(isClosedError({ message: "CLOSED: the shop is not open yet" })).toBe(true);
    expect(isClosedError(new Error("INVALID: phone"))).toBe(false);
    expect(isClosedError(null)).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  clearWithdrawPin,
  hasWithdrawPin,
  saveWithdrawPin,
  storageKeyForOwner,
  verifyWithdrawPin,
  withdrawPinFormatError,
  withdrawStartPath,
  WITHDRAW_PIN_LEGACY_ANON,
  WITHDRAW_PIN_MAX_FAILS,
} from "@/lib/payments/withdrawPin";

const owner = "test-user";

afterEach(() => {
  clearWithdrawPin(owner);
  clearWithdrawPin(WITHDRAW_PIN_LEGACY_ANON);
});

describe("withdraw PIN", () => {
  it("rejects short or weak pins", () => {
    expect(withdrawPinFormatError("123")).toBeTruthy();
    expect(withdrawPinFormatError("123456")).toBeTruthy();
    expect(withdrawPinFormatError("000000")).toBeTruthy();
    expect(withdrawPinFormatError("482917")).toBeNull();
  });

  it("saves a hash and verifies the same pin", async () => {
    await saveWithdrawPin(owner, "482917");
    expect(hasWithdrawPin(owner)).toBe(true);
    expect(localStorage.getItem(storageKeyForOwner(owner))).not.toContain("482917");
    expect(await verifyWithdrawPin(owner, "482917")).toEqual({ ok: true });
    expect(await verifyWithdrawPin(owner, "482918")).toMatchObject({
      ok: false,
      reason: "mismatch",
      remaining: WITHDRAW_PIN_MAX_FAILS - 1,
    });
  });

  it("locks after too many mismatches", async () => {
    await saveWithdrawPin(owner, "482917");
    for (let i = 0; i < WITHDRAW_PIN_MAX_FAILS - 1; i++) {
      const result = await verifyWithdrawPin(owner, "111222");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("mismatch");
    }
    const locked = await verifyWithdrawPin(owner, "111222");
    expect(locked).toMatchObject({ ok: false, reason: "locked" });
  });

  it("remembers a PIN stored under the legacy anon key", async () => {
    await saveWithdrawPin(WITHDRAW_PIN_LEGACY_ANON, "482917");
    expect(hasWithdrawPin(owner)).toBe(true);
    expect(await verifyWithdrawPin(owner, "482917")).toEqual({ ok: true });
    expect(hasWithdrawPin(owner)).toBe(true);
    expect(localStorage.getItem(storageKeyForOwner(WITHDRAW_PIN_LEGACY_ANON))).toBeNull();
  });

  it("keeps the pin after save so withdraw can skip setup", async () => {
    expect(hasWithdrawPin(owner)).toBe(false);
    await saveWithdrawPin(owner, "482917");
    expect(hasWithdrawPin(owner)).toBe(true);
    expect(withdrawStartPath({ preview: true })).toBe("/earnings/withdraw?preview=wallet");
    expect(withdrawStartPath({})).toBe("/earnings/withdraw");
  });
});

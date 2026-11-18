import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { onAuthStateChange: vi.fn() },
  },
}));

import {
  isAplus1PaymentsEnabled,
  isBetaFeedbackEnabled,
  isLaunchHiddenPath,
  isSoloEcosystemEnabled,
  isUpgradePath,
} from "../aplus1Launch";
import { storePlatforms, storePlatformsLabel } from "../appShell";
import { downloadBlob, BLOB_URL_LIFETIME_MS } from "../downloadBlob";
import { disableNativePush, enableNativePush, getNativePushState, hasNativePush } from "../nativePush";
import { canShowStudioQuoteUpsell } from "../studioQuotationHandoff";

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605 Mobile/15E148 SamecorApp SamecorIos";
const SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605 Version/18.0 Mobile/15E148 Safari/604.1";
const withUa = (ua: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);

type Win = Window & { Capacitor?: { Plugins?: Record<string, unknown> } };

function fakePushPlugin(permission: "granted" | "denied" | "prompt", token = "a1b2c3d4".repeat(8)) {
  const listeners: Record<string, (payload: unknown) => void> = {};
  return {
    checkPermissions: vi.fn(async () => ({ receive: permission })),
    requestPermissions: vi.fn(async () => ({ receive: permission })),
    register: vi.fn(async () => {
      setTimeout(() => listeners.registration?.({ value: token }), 0);
    }),
    addListener: vi.fn(async (event: string, cb: (payload: unknown) => void) => {
      listeners[event] = cb;
      return { remove: async () => undefined };
    }),
  };
}

describe("iOS app: App Review rules", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    delete (window as Win).Capacitor;
    window.localStorage.clear();
    rpc.mockReset();
  });

  it("keeps paid plans out of the store apps but not off the website", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_SOLO_ECOSYSTEM_ENABLED", "true");
    expect(isUpgradePath("/upgrade")).toBe(true);
    expect(isUpgradePath("/upgrade/checkout")).toBe(true);
    expect(isUpgradePath("/upgrades")).toBe(false);

    withUa(IOS_UA);
    expect(isLaunchHiddenPath("/upgrade")).toBe(true);
    expect(isSoloEcosystemEnabled()).toBe(false);
    expect(canShowStudioQuoteUpsell("free", "owner")).toBe(false);

    vi.restoreAllMocks();
    withUa(SAFARI_UA);
    expect(isLaunchHiddenPath("/upgrade")).toBe(false);
    expect(canShowStudioQuoteUpsell("free", "owner")).toBe(true);
  });

  it("hides beta wording, payments and referral rewards in the iOS app only", () => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
    vi.stubEnv("VITE_APLUS1_PAYMENTS_ENABLED", "true");
    withUa(IOS_UA);
    expect(isBetaFeedbackEnabled()).toBe(false);
    expect(isAplus1PaymentsEnabled()).toBe(false);
    expect(isLaunchHiddenPath("/referrals")).toBe(true);

    vi.restoreAllMocks();
    withUa(SAFARI_UA);
    expect(isBetaFeedbackEnabled()).toBe(true);
    expect(isAplus1PaymentsEnabled()).toBe(true);
  });

  it("names only the current platform's store in legal copy", () => {
    withUa(IOS_UA);
    expect(storePlatforms()).toEqual({ android: false, ios: true });
    expect(storePlatformsLabel("en")).toBe("iOS");
    vi.restoreAllMocks();
    withUa(SAFARI_UA);
    expect(storePlatforms()).toEqual({ android: true, ios: true });
    expect(storePlatformsLabel()).toBe("Android และ iOS");
  });

  describe("downloads", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("keeps the blob URL alive long enough for WebKit to read it", () => {
      // jsdom has no object URLs.
      const create = vi.fn(() => "blob:https://samecor.com/x");
      const revoke = vi.fn();
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

      downloadBlob(new Blob(["{}"]), "export.json");
      expect(create).toHaveBeenCalledOnce();
      expect(revoke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(BLOB_URL_LIFETIME_MS);
      expect(revoke).toHaveBeenCalledWith("blob:https://samecor.com/x");
    });
  });

  describe("native push", () => {
    it("is off outside the iOS app, even when a Capacitor bridge exists", async () => {
      withUa(SAFARI_UA);
      (window as Win).Capacitor = { Plugins: { PushNotifications: fakePushPlugin("granted") } };
      expect(hasNativePush()).toBe(false);
      await expect(getNativePushState()).resolves.toBe("unsupported");
    });

    it("saves the APNs token when the user turns push on, and removes it when turned off", async () => {
      withUa(IOS_UA);
      const token = "ab".repeat(32);
      const push = fakePushPlugin("granted", token);
      (window as Win).Capacitor = { Plugins: { PushNotifications: push } };
      rpc.mockResolvedValue({ error: null });

      expect(hasNativePush()).toBe(true);
      await expect(getNativePushState()).resolves.toBe("off");
      await expect(enableNativePush()).resolves.toBe("on");
      expect(rpc).toHaveBeenCalledWith("save_apns_token", expect.objectContaining({ _token: token }));
      await expect(getNativePushState()).resolves.toBe("on");

      await expect(disableNativePush()).resolves.toBe("off");
      expect(rpc).toHaveBeenLastCalledWith("remove_push_subscription", { _endpoint: `apns:${token}` });
      await expect(getNativePushState()).resolves.toBe("off");
    });

    it("reports denied when iOS notifications are blocked", async () => {
      withUa(IOS_UA);
      (window as Win).Capacitor = { Plugins: { PushNotifications: fakePushPlugin("denied") } };
      await expect(enableNativePush()).resolves.toBe("denied");
      expect(rpc).not.toHaveBeenCalled();
    });
  });
});

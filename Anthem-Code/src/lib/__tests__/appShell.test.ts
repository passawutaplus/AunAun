import { afterEach, describe, expect, it, vi } from "vitest";
import { isAndroidApp, isIosApp, isNativeApp, isWebViewApp, shellName } from "../appShell";

const withUa = (ua: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);

describe("app shell detection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("tells the iOS app from the Android app by their user-agent markers", () => {
    withUa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605 Mobile/15E148 SamecorApp SamecorIos");
    expect(isIosApp()).toBe(true);
    expect(isWebViewApp()).toBe(true);
    expect(isAndroidApp()).toBe(false);
    expect(isNativeApp()).toBe(true);
    expect(shellName()).toBe("ios");
  });

  it("keeps the Android app as it was", () => {
    withUa("Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537 Chrome/130 Mobile Safari/537 SamecorApp");
    expect(isIosApp()).toBe(false);
    expect(isAndroidApp()).toBe(true);
    expect(shellName()).toBe("android");
  });

  it("treats plain Safari and Chrome as the web", () => {
    withUa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605 Version/18.0 Mobile/15E148 Safari/604.1");
    expect(isNativeApp()).toBe(false);
    expect(shellName()).toBe("web");
  });
});

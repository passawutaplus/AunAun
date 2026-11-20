import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appReturnUrl,
  hasShellFeature,
  nativeAppleSignIn,
  openAuthInSystemBrowser,
  requestStoreReview,
  ShellCanceledError,
} from "../nativeShell";

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537 Chrome/130 Mobile Safari/537 SamecorApp";
const withUa = (ua: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
type ShellWindow = Window & { SamecorShell?: Record<string, unknown> };
const setShell = (shell: Record<string, unknown> | undefined) => {
  (window as ShellWindow).SamecorShell = shell;
};

describe("native shell features", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setShell(undefined);
  });

  it("reports nothing on the website, even if a page defines SamecorShell", () => {
    withUa("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537 Chrome/130 Safari/537");
    setShell({ getFeatures: () => "auth,review" });
    expect(hasShellFeature("auth")).toBe(false);
  });

  it("reports nothing in app builds without getFeatures (Android 1.1.1, iOS 1.0.0)", () => {
    withUa(ANDROID_UA);
    setShell({ getAppVersion: () => "1.1.1 (5)", setSystemBarColor: () => undefined });
    expect(hasShellFeature("auth")).toBe(false);
    expect(openAuthInSystemBrowser("https://example.supabase.co/auth/v1/authorize")).toBe(false);
    expect(requestStoreReview()).toBe(false);
  });

  it("reads the comma list the shell returns", () => {
    withUa(ANDROID_UA);
    const openAuth = vi.fn();
    const requestReview = vi.fn();
    setShell({ getFeatures: () => " auth, review ,share", openAuth, requestReview });
    expect(hasShellFeature("auth")).toBe(true);
    expect(hasShellFeature("share")).toBe(true);
    expect(hasShellFeature("push")).toBe(false);
    expect(openAuthInSystemBrowser("https://example.supabase.co/auth/v1/authorize")).toBe(true);
    expect(openAuth).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/authorize");
    expect(requestStoreReview()).toBe(true);
    expect(requestReview).toHaveBeenCalledOnce();
  });

  it("builds the app return URLs on the current origin", () => {
    expect(appReturnUrl()).toBe(`${window.location.origin}/auth/app-return`);
    expect(appReturnUrl("reset-password")).toBe(`${window.location.origin}/auth/app-return?to=reset-password`);
  });

  it("turns the Apple sheet's answers into a token, a cancel or an error", async () => {
    withUa(`${ANDROID_UA} SamecorIos`);
    const signInWithApple = vi
      .fn()
      .mockResolvedValueOnce({ token: "id-token", name: " Aun " })
      .mockResolvedValueOnce({ error: "canceled" })
      .mockResolvedValueOnce({ error: "boom" });
    setShell({ getFeatures: () => "auth,apple", signInWithApple });
    await expect(nativeAppleSignIn("hash")).resolves.toEqual({ token: "id-token", name: "Aun" });
    await expect(nativeAppleSignIn("hash")).rejects.toBeInstanceOf(ShellCanceledError);
    await expect(nativeAppleSignIn("hash")).rejects.toThrow("boom");
    expect(signInWithApple).toHaveBeenCalledWith("hash");
  });
});

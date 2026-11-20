import type { OAuthProviderId } from "@/integrations/oauth";

export type ExtraProviderKey = "apple" | "line" | "facebook";
export type ExtraProvider = { key: ExtraProviderKey; id: OAuthProviderId; name: string };

/** Sign-in options beyond Google, in display order. */
export const EXTRA_PROVIDERS: ExtraProvider[] = [
  { key: "apple", id: "apple", name: "Apple" },
  { key: "line", id: "custom:line", name: "LINE" },
  { key: "facebook", id: "facebook", name: "Facebook" },
];

/**
 * Extra sign-in buttons are off until the provider is set up in Supabase.
 * VITE_AUTH_EXTRA_PROVIDERS="apple,line,facebook" (any subset). "apple" turns on Apple's web
 * sign-in (Services ID + secret in Supabase); the iOS app always uses the native sheet instead.
 */
export function enabledExtraProviders(): ExtraProvider[] {
  const raw = String(import.meta.env.VITE_AUTH_EXTRA_PROVIDERS ?? "");
  const keys = new Set(
    raw
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  );
  return EXTRA_PROVIDERS.filter((p) => keys.has(p.key));
}

/**
 * Sign-in rows in display order: Apple (native sheet in the iOS app, web sign-in elsewhere when
 * enabled), then Google, then the other enabled providers.
 */
export function signInProviders(nativeApple: boolean): { key: "google" | ExtraProviderKey; id: OAuthProviderId; name: string }[] {
  const extras = enabledExtraProviders();
  const apple = nativeApple || extras.some((p) => p.key === "apple") ? EXTRA_PROVIDERS.filter((p) => p.key === "apple") : [];
  return [...apple, { key: "google", id: "google", name: "Google" }, ...extras.filter((p) => p.key !== "apple")];
}

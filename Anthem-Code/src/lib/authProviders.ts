import type { OAuthProviderId } from "@/integrations/oauth";

export type ExtraProviderKey = "line" | "facebook";
export type ExtraProvider = { key: ExtraProviderKey; id: OAuthProviderId; name: string };

/** Sign-in options beyond Google, in display order. */
export const EXTRA_PROVIDERS: ExtraProvider[] = [
  { key: "line", id: "custom:line", name: "LINE" },
  { key: "facebook", id: "facebook", name: "Facebook" },
];

/**
 * Extra sign-in buttons are off until the provider is set up in Supabase.
 * VITE_AUTH_EXTRA_PROVIDERS="line,facebook" (any subset).
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

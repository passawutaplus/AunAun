/**
 * Supabase API keys for Edge Functions.
 *
 * Supabase injects the new keys as JSON objects keyed by name (SUPABASE_SECRET_KEYS, SUPABASE_PUBLISHABLE_KEYS)
 * next to the legacy single-string SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY. Read the new key first and fall
 * back to the legacy one, so a function keeps working before and after the legacy JWT keys are deactivated.
 *
 * Use the secret key only on the server; it bypasses Row Level Security.
 */

function readNamedKey(envName: string, name: string): string | undefined {
  const raw = Deno.env.get(envName);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const value = (parsed as Record<string, unknown>)[name];
      if (typeof value === "string" && value) return value;
    }
  } catch {
    /* not JSON — ignore and fall back */
  }
  return undefined;
}

/** Server-side admin key (was SUPABASE_SERVICE_ROLE_KEY). Empty string when none is configured. */
export function supabaseSecretKey(name = "default"): string {
  return readNamedKey("SUPABASE_SECRET_KEYS", name) ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

/** Public key for user-scoped clients (was SUPABASE_ANON_KEY). Empty string when none is configured. */
export function supabasePublishableKey(name = "default"): string {
  return readNamedKey("SUPABASE_PUBLISHABLE_KEYS", name) ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

const DEFAULT_SUPABASE_URL = "https://zkflkpbmbozrchqncpzi.supabase.co";
// Public (publishable) key, already shipped in the browser bundle.
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_quMW7_9oK23pal-Qj6O8Rg_ioGG-dus";

export function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VAULT_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
}

export function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY || "";
}

export function publishableKey() {
  return process.env.VAULT_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_PUBLISHABLE_KEY;
}

export function storageConfigured() {
  return Boolean(serviceRoleKey());
}

export function notConfiguredError(feature = "Vault API storage") {
  const error = new Error(`${feature} is not configured on the server.`);
  error.status = 503;
  return error;
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Service-role request to Supabase (PostgREST / Storage). Returns parsed JSON or null.
 * `prefer: "return=minimal"` avoids shipping written rows back when the caller ignores them.
 */
export async function supabaseRest(path, { method = "GET", body, headers = {}, prefer, errorMessage = "Supabase request failed.", feature } = {}) {
  const key = serviceRoleKey();
  if (!key) throw notConfiguredError(feature);
  const isBuffer = Buffer.isBuffer(body);
  const response = await fetch(`${supabaseUrl()}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      accept: "application/json",
      ...(body !== undefined && !isBuffer ? { "content-type": "application/json" } : {}),
      ...(prefer ? { prefer } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isBuffer ? body : JSON.stringify(body),
  });
  const data = parseBody(await response.text());
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || errorMessage);
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return data;
}

export const eq = value => `eq.${encodeURIComponent(value)}`;

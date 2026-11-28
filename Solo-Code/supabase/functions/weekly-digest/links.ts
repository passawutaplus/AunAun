/**
 * Signed one-click turn-off links for the weekly e-mail: `u` = user id, `t` = HMAC-SHA256 of
 * "weekly-off:<user id>" with the function's internal secret (no table, no new secret). Web Crypto only,
 * so it runs in Deno and in the web app's tests.
 */

const enc = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signWeeklyOff(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`weekly-off:${userId.toLowerCase()}`),
  );
  return base64url(new Uint8Array(mac)).slice(0, 32);
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `token` was signed for `userId` with any of the secrets (old links keep working after a change). */
export async function verifyWeeklyOff(
  userId: string,
  token: string,
  secrets: readonly string[],
): Promise<boolean> {
  if (!UUID.test(userId) || !/^[A-Za-z0-9_-]{32}$/.test(token)) return false;
  for (const secret of secrets) {
    if (secret && sameText(await signWeeklyOff(userId, secret), token)) return true;
  }
  return false;
}

/** Page on the site (one click turns it off, with a button to turn it back on). */
export function weeklyOffPageUrl(site: string, userId: string, token: string): string {
  return `${site}/email/off?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`;
}

/** RFC 8058 one-click target for the List-Unsubscribe header (mail apps POST to it). */
export function weeklyOffPostUrl(functionUrl: string, userId: string, token: string): string {
  return `${functionUrl}?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`;
}

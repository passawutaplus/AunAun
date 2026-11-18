// Apple Push Notification service (APNs) for the SAMECOR iOS app, using token auth:
// a short JWT signed with the team's .p8 key, sent over HTTP/2 to api.push.apple.com.
//
// Secrets: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (full contents of AuthKey_XXXXXXXXXX.p8),
// APNS_TOPIC (bundle id, default com.samecor.app), APNS_HOST (default api.push.apple.com; TestFlight and
// App Store builds use production, only Xcode debug builds need api.sandbox.push.apple.com).

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  topic: string;
  host: string;
};

export type ApnsMessage = {
  title: string;
  body: string;
  /** Opened when the notification is tapped (src/lib/pushNotifications.ts reads data.url). */
  url: string;
  /** Same id → the new notification replaces the old one (like the web push tag). */
  collapseId?: string;
  highPriority?: boolean;
};

export type ApnsResult =
  | { ok: true }
  | { ok: false; status: number; reason: string; gone: boolean };

export function apnsConfigFromEnv(): ApnsConfig | null {
  const keyId = Deno.env.get("APNS_KEY_ID")?.trim();
  const teamId = Deno.env.get("APNS_TEAM_ID")?.trim();
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY")?.trim();
  if (!keyId || !teamId || !privateKey) return null;
  return {
    keyId,
    teamId,
    privateKey,
    topic: Deno.env.get("APNS_TOPIC")?.trim() || "com.samecor.app",
    host: Deno.env.get("APNS_HOST")?.trim() || "api.push.apple.com",
  };
}

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const base64UrlText = (text: string) => base64Url(new TextEncoder().encode(text));

let cachedToken: { jwt: string; issuedAt: number; keyId: string } | null = null;

/** Apple accepts a provider token for an hour and rejects refreshing it more than every 20 minutes. */
async function providerToken(config: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.keyId === config.keyId && now - cachedToken.issuedAt < 50 * 60) {
    return cachedToken.jwt;
  }
  // Secrets pasted on one line keep "\n" literally; the PEM body is what matters.
  const pemBody = config.privateKey
    .replace(/\\n/g, "\n")
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signingInput = `${base64UrlText(JSON.stringify({ alg: "ES256", kid: config.keyId }))}.${base64UrlText(
    JSON.stringify({ iss: config.teamId, iat: now }),
  )}`;
  // WebCrypto returns the raw r||s signature, which is the format JWS ES256 expects.
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  const jwt = `${signingInput}.${base64Url(signature)}`;
  cachedToken = { jwt, issuedAt: now, keyId: config.keyId };
  return jwt;
}

export async function sendApns(
  config: ApnsConfig,
  deviceToken: string,
  message: ApnsMessage,
): Promise<ApnsResult> {
  const headers: Record<string, string> = {
    authorization: `bearer ${await providerToken(config)}`,
    "apns-topic": config.topic,
    "apns-push-type": "alert",
    "apns-priority": message.highPriority ? "10" : "5",
    "apns-expiration": String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
    "content-type": "application/json",
  };
  if (message.collapseId) headers["apns-collapse-id"] = message.collapseId.slice(0, 64);

  const payload = {
    aps: {
      alert: { title: message.title, body: message.body },
      sound: "default",
      ...(message.collapseId ? { "thread-id": message.collapseId } : {}),
    },
    url: message.url,
  };

  const res = await fetch(`https://${config.host}/3/device/${deviceToken}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };

  let reason = "";
  try {
    reason = String((await res.json()).reason ?? "");
  } catch {
    // empty body
  }
  // 410 = the app was removed or notifications turned off; these 400s mean the token can never work.
  const gone =
    res.status === 410 ||
    (res.status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(reason));
  return { ok: false, status: res.status, reason, gone };
}

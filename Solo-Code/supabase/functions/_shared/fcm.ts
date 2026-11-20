// Firebase Cloud Messaging (HTTP v1) for the SAMECOR Android app (1.2.0+, Anthem-Code/capacitor-shell/android).
// A service account signs a short JWT (RS256, WebCrypto), Google swaps it for an OAuth access token, and each
// notification is one POST to fcm.googleapis.com/v1/projects/<project>/messages:send.
//
// Secret: FCM_SERVICE_ACCOUNT = the whole JSON file from Firebase console → Project settings → Service accounts →
// Generate new private key. Without it send-push skips Android app devices.

export type FcmConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type FcmMessage = {
  title: string;
  body: string;
  /** Opened when the notification is tapped (src/lib/nativePush.ts reads data.url). */
  url: string;
  /** Same tag → the new notification replaces the old one (like the web push tag). */
  tag?: string;
  /** Large picture under the text (https only). */
  image?: string;
  highPriority?: boolean;
};

export type FcmResult = { ok: true } | { ok: false; status: number; reason: string; gone: boolean };

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function fcmConfigFromEnv(): FcmConfig | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT")?.trim();
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!account.project_id || !account.client_email || !account.private_key) return null;
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    };
  } catch {
    console.warn("[fcm] FCM_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }
}

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const base64UrlText = (text: string) => base64Url(new TextEncoder().encode(text));

let cachedToken: { token: string; expiresAt: number; clientEmail: string } | null = null;

/** Google OAuth access token for FCM; cached until five minutes before it expires. */
async function accessToken(config: FcmConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedToken &&
    cachedToken.clientEmail === config.clientEmail &&
    cachedToken.expiresAt - 300 > now
  ) {
    return cachedToken.token;
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
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signingInput = `${base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64UrlText(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput)),
  );
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64Url(signature)}`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`FCM auth failed: ${res.status} ${data.error ?? ""}`.trim());
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
    clientEmail: config.clientEmail,
  };
  return data.access_token;
}

export async function sendFcm(
  config: FcmConfig,
  deviceToken: string,
  message: FcmMessage,
): Promise<FcmResult> {
  const tag = message.tag?.slice(0, 64);
  const payload = {
    message: {
      token: deviceToken,
      notification: {
        title: message.title,
        body: message.body,
        ...(message.image ? { image: message.image } : {}),
      },
      // Every value in data must be a string.
      data: { url: message.url },
      android: {
        priority: message.highPriority ? "HIGH" : "NORMAL",
        ttl: "86400s",
        ...(tag ? { collapse_key: tag } : {}),
        notification: {
          sound: "default",
          ...(tag ? { tag } : {}),
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${await accessToken(config)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (res.ok) return { ok: true };

  let reason = "";
  let errorCode = "";
  try {
    const error = (await res.json()).error as {
      message?: string;
      details?: { errorCode?: string }[];
    };
    reason = String(error?.message ?? "");
    errorCode = String(error?.details?.find((d) => d.errorCode)?.errorCode ?? "");
  } catch {
    // empty body
  }
  // UNREGISTERED / 404: the app was removed or the token expired. A 400 about the token means it can never work.
  const gone =
    res.status === 404 ||
    errorCode === "UNREGISTERED" ||
    (res.status === 400 && /registration token/i.test(reason));
  return { ok: false, status: res.status, reason: errorCode || reason, gone };
}

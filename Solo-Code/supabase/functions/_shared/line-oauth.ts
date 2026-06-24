/** LINE Login token exchange + id_token verification (server-side only). */

export interface LineVerifiedProfile {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}

export function lineChannelId(): string {
  return Deno.env.get("LINE_CHANNEL_ID") ?? "2010369791";
}

export function lineChannelSecret(): string {
  const s = Deno.env.get("LINE_CHANNEL_SECRET");
  if (!s) throw new Error("LINE_CHANNEL_SECRET not configured");
  return s;
}

export async function exchangeLineAuthCode(
  code: string,
  redirectUri: string,
): Promise<{ idToken: string; accessToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: lineChannelId(),
    client_secret: lineChannelSecret(),
  });

  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`line_token_exchange_failed: ${err}`);
  }

  const data = await res.json();
  const idToken = data.id_token as string | undefined;
  const accessToken = data.access_token as string | undefined;
  if (!idToken) throw new Error("missing_id_token");
  return { idToken, accessToken: accessToken ?? "" };
}

export async function verifyLineIdToken(idToken: string): Promise<LineVerifiedProfile> {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: lineChannelId(),
  });

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`line_id_token_invalid: ${err}`);
  }

  const data = await res.json();
  const sub = data.sub as string | undefined;
  if (!sub) throw new Error("missing_sub");

  return {
    lineUserId: sub,
    displayName: typeof data.name === "string" ? data.name : undefined,
    pictureUrl: typeof data.picture === "string" ? data.picture : undefined,
  };
}

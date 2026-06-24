/**
 * LINE **Login** channel id (OAuth / LIFF) — ไม่ใช่ Messaging API channel id
 * ช่อง LINE Login: 2010369791 · Messaging API (Push): 2010369565
 */
export const LINE_CHANNEL_ID =
  (import.meta.env.VITE_LINE_CHANNEL_ID as string | undefined)?.trim() || "2010369791";

export const LINE_LIFF_ID = (import.meta.env.VITE_LINE_LIFF_ID as string | undefined)?.trim() || "";

export const LINE_OA_ID = "@solofreelancer";
export const LINE_OA_URL = "https://lin.ee/q3W9Qds";

const SITE =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "https://www.solofreelancer.com");

/** Must match Callback URL registered in LINE Developers Console. */
export function lineOAuthRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/line-link`;
  }
  return `${SITE}/line-link`;
}

export function buildLineAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINE_CHANNEL_ID,
    redirect_uri: lineOAuthRedirectUri(),
    state,
    scope: "profile openid",
    bot_prompt: "aggressive",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

export const LINE_OAUTH_STATE_KEY = "so1o.line.oauth.state";
export const LINE_OAUTH_CODE_KEY = "so1o.line.oauth.code";

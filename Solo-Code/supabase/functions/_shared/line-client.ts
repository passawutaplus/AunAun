// LINE Messaging API push helper for edge functions.

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export interface LinePushResult {
  ok: boolean;
  status: number;
  retryAfterSeconds?: number;
  error?: string;
}

export async function pushLineText(lineUserId: string, text: string): Promise<LinePushResult> {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    return { ok: false, status: 503, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" };
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });

  if (res.ok) {
    return { ok: true, status: res.status };
  }

  const retryAfter = res.headers.get("retry-after");
  let errorBody = "";
  try {
    errorBody = await res.text();
  } catch {
    /* ignore */
  }

  return {
    ok: false,
    status: res.status,
    retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    error: errorBody || res.statusText,
  };
}

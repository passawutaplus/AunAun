const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function replyLineText(replyToken: string, text: string): Promise<boolean> {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return false;

  const res = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[line-reply]", res.status, err.slice(0, 300));
  }
  return res.ok;
}

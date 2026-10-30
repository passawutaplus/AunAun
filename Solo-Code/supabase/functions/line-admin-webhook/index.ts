// LINE webhook of the admin bot (@samecor Messaging API channel).
// Verifies LINE's signature, then does two things:
//   • joins a group  -> says hello and prints the group id (to put into LINE_SAMECOR_ADMIN_GROUP_ID)
//   • "/id" or "/ping" typed in a group -> answers with the group id / that it is alive
// Everything else is ignored. Replies use the (free) reply API, so they do not use the push quota.
//
// Secrets: LINE_SAMECOR_ADMIN_CHANNEL_SECRET (signature check), LINE_SAMECOR_ADMIN_ACCESS_TOKEN (reply).

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function validSignature(secret: string, rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = btoa(String.fromCharCode(...mac));
  // Constant-time compare.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function reply(token: string, replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type?: string; groupId?: string; roomId?: string };
  message?: { type?: string; text?: string };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  const secret = Deno.env.get("LINE_SAMECOR_ADMIN_CHANNEL_SECRET");
  const token = Deno.env.get("LINE_SAMECOR_ADMIN_ACCESS_TOKEN");
  if (!secret) return json({ error: "not configured" }, 503);

  const raw = await req.text();
  if (!(await validSignature(secret, raw, req.headers.get("x-line-signature")))) {
    return json({ error: "invalid signature" }, 401);
  }
  if (!token) return json({ ok: true, note: "no access token" });

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return json({ ok: true });
  }

  for (const ev of events) {
    const groupId = ev.source?.groupId ?? ev.source?.roomId;
    if (!ev.replyToken || !groupId) continue;
    if (ev.type === "join") {
      await reply(
        token,
        ev.replyToken,
        `สวัสดีครับ 👋 SAMECOR Bot เข้ากลุ่มแล้ว\nรหัสกลุ่ม: ${groupId}\n(นำไปตั้งเป็น LINE_SAMECOR_ADMIN_GROUP_ID ใน Supabase Secrets)`,
      );
    } else if (ev.type === "message" && ev.message?.type === "text") {
      const text = (ev.message.text ?? "").trim().toLowerCase();
      if (text === "/id") await reply(token, ev.replyToken, `รหัสกลุ่ม: ${groupId}`);
      else if (text === "/ping") await reply(token, ev.replyToken, "pong ✅ บอตทำงานอยู่");
    }
  }
  return json({ ok: true });
});

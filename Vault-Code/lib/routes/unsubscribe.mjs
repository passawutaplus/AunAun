import { verifyUnsubscribe } from "../engine/digest.mjs";
import { applyCors, sendJson } from "../vault-api-shared.mjs";
import { clientIp, rateLimit } from "../rate-limit.mjs";
import { rpcQuiet } from "../engine/discover-read.mjs";

const PAGE = ok => `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>A+ Vault</title><style>body{font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#2f3133}a{color:#e33f34}</style></head><body><h1>${ok ? "ยกเลิกการรับอีเมลแล้ว" : "ลิงก์นี้ใช้ไม่ได้"}</h1><p>${ok ? "เราจะไม่ส่งสรุปรายสัปดาห์ให้คุณอีก เปิดรับใหม่ได้ในหน้าตั้งค่า" : "ลิงก์ยกเลิกไม่ถูกต้องหรือหมดอายุ ลองกดจากอีเมลล่าสุดอีกครั้ง"}</p><p><a href="/vault">กลับไป A+ Vault</a></p></body></html>`;

/** One-click unsubscribe (GET from the link, POST from RFC 8058 mail clients). The signed token is the only credential. */
export default async function handler(req, res) {
  applyCors(res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (!["GET", "POST"].includes(req.method)) return sendJson(res, 405, { success: false, message: "Method not allowed." });
  try {
    rateLimit(`unsub:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  } catch {
    return sendJson(res, 429, { success: false, code: "RATE_LIMITED", message: "Too many requests." });
  }
  const token = new URL(req.url || "/", "http://localhost").searchParams.get("t") || "";
  const userId = verifyUnsubscribe(token);
  if (userId) await rpcQuiet("digest_unsubscribe", { p_user: userId });
  res.statusCode = userId ? 200 : 400;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(PAGE(Boolean(userId)));
}

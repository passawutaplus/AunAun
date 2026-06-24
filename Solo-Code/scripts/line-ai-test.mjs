#!/usr/bin/env node
/**
 * Test LINE AI flow for the linked profile (direct push, no webhook).
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/line-ai-test.mjs
 *   node scripts/line-ai-test.mjs --user-id <uuid>
 *
 * Reads Solo-Code/.env + .env.line
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.line"));

const args = process.argv.slice(2);
const userIdIdx = args.indexOf("--user-id");
const userIdArg = userIdIdx >= 0 ? args[userIdIdx + 1] : null;
const testMessage = args.includes("--message")
  ? args[args.indexOf("--message") + 1]
  : "ราคาโลโก้ควรเริ่มเท่าไหร่";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY?.trim();
const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!geminiKey) {
  console.error("Missing GEMINI_API_KEY — ใส่ใน Solo-Code/.env แล้วรัน:");
  console.error(
    "  npx supabase secrets set GEMINI_API_KEY='...' --project-ref rvnzjiskqliexysicfmh",
  );
  process.exit(1);
}
if (!lineToken) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN in .env.line");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function supabase(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${text}`);
  if (!text || res.status === 204) return null;
  return JSON.parse(text);
}

async function geminiReply(prompt) {
  const model = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash-lite";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'คุณคือ "So1o Mentor" ตอบภาษาไทย กระชับ เป็นกันเอง',
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.7 },
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

async function pushLine(lineUserId, text) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });
  if (!res.ok) throw new Error(`LINE push ${res.status}: ${await res.text()}`);
}

async function main() {
  let userId = userIdArg;
  if (!userId) {
    const rows = await supabase(
      "profiles?select=user_id&line_messaging_user_id=not.is.null&order=line_linked_at.desc&limit=1",
    );
    userId = rows?.[0]?.user_id;
  }
  if (!userId) throw new Error("no_linked_profile");

  const profiles = await supabase(
    `profiles?select=display_name,brand_name,line_messaging_user_id,subscription_tier&user_id=eq.${userId}&limit=1`,
  );
  const profile = profiles?.[0];
  if (!profile?.line_messaging_user_id) throw new Error("line_not_linked");

  console.log(`Testing AI → LINE for ${profile.display_name ?? userId}`);
  console.log(`Message: ${testMessage}`);

  const answer = await geminiReply(testMessage);
  const signoff = [profile.brand_name, profile.display_name].filter(Boolean).join(" · ");
  const text = [answer, "", signoff || null, "credit ai : (test push)"].filter(Boolean).join("\n");

  await pushLine(profile.line_messaging_user_id, text);
  console.log("OK — pushed to LINE");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

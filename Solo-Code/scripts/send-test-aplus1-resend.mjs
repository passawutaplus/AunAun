/**
 * Send a test Aplus1 email via Resend.
 * Usage: node scripts/send-test-aplus1-resend.mjs you@example.com
 * Requires RESEND_API_KEY in Solo-Code/.env
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const to = process.argv[2] || process.env.TEST_EMAIL;
if (!to) {
  console.error("Usage: node scripts/send-test-aplus1-resend.mjs <email>");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY not set in Solo-Code/.env");
  process.exit(1);
}

const from =
  process.env.APLUS1_EMAIL_FROM ?? "Aplus1 <noreply@aplus1.app>";

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "ทดสอบอีเมล Aplus1 — Resend",
    html: `<p>สวัสดี — นี่คืออีเมลทดสอบจาก <strong>Aplus1</strong> ผ่าน Resend</p><p><a href="https://aplus1.app">เปิด aplus1.app</a></p>`,
    text: "สวัสดี — นี่คืออีเมลทดสอบจาก Aplus1 ผ่าน Resend\nhttps://aplus1.app",
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Resend error:", res.status, body);
  process.exit(1);
}

console.log("Sent OK:", body);

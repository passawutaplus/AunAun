#!/usr/bin/env node
/**
 * ทดสอบส่ง LINE Push หลังเชื่อมบัญชีสำเร็จ
 * Usage: TEST_EMAIL=passawut.a.plus@gmail.com node scripts/line-test-push.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");
for (const p of [
  join(repoRoot, "Solo-Code", ".env"),
  join(repoRoot, "Solo-Code", ".env.line"),
  join(anthemRoot, ".env"),
]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const email = (process.env.TEST_EMAIL || "passawut.a.plus@gmail.com").trim().toLowerCase();
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) {
  console.error("ไม่มี LINE_CHANNEL_ACCESS_TOKEN ใน .env.line");
  process.exit(1);
}
if (!url || !key) {
  console.error("ไม่มี SUPABASE_URL / SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const { data: prof, error } = await sb
  .from("profiles")
  .select("line_messaging_user_id, display_name, line_notify_enabled")
  .ilike("email", email)
  .maybeSingle();
if (error) throw error;

if (!prof?.line_messaging_user_id) {
  console.error(`
ยังส่ง Push ไม่ได้ — บัญชียังไม่ได้「เชื่อม LINE」

เพิ่มเพื่อน @solofreelancer อย่างเดียวไม่พอ ต้องกด「เชื่อมด้วย LINE」ให้สำเร็จก่อน
(ตอนนี้ OAuth error 400 = Callback URL ยังไม่ตรง)

แก้: LINE Console ช่อง Login 2010369791 → Callback URL → เพิ่ม:
  http://localhost:8080/line-link

แล้วกดเชื่อมใหม่ที่ /line-link
`);
  process.exit(1);
}

const lineUserId = prof.line_messaging_user_id;
const text = `🎉 ทดสอบจาก So1o @solofreelancer\nสวัสดี${prof.display_name ? ` ${prof.display_name}` : ""} — แจ้งเตือน LINE ใช้งานได้แล้ว!`;

const res = await fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    to: lineUserId,
    messages: [{ type: "text", text }],
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error("Push failed:", res.status, body);
  if (res.status === 403) {
    console.error("มักเกิดเมื่อยังไม่ได้เพิ่มเพื่อน @solofreelancer หรือ token ผิดช่อง");
  }
  process.exit(1);
}

console.log("✓ ส่ง Push สำเร็จ →", lineUserId);
console.log("ข้อความ:", text);

#!/usr/bin/env node
/**
 * Send all LINE test sample notifications (direct push).
 *
 * Usage:
 *   node scripts/send-line-test-samples.mjs --recent
 *   node scripts/send-line-test-samples.mjs --user-id <uuid>
 *
 * Reads Solo-Code/.env + .env.line (LINE_CHANNEL_ACCESS_TOKEN).
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

const SOLO_BASE = "https://solofreelancer.com";
const ANTHEM_BASE = "https://an1hem.app";
const HEADER = "[So1o Freelancer Notification]";
const PRO_TIERS = new Set(["pro", "pro_plus", "inhouse"]);

const KIND_COPY = {
  portal_slip: {
    hook: "ลูกค้าชำระเงินแล้ว 💸",
    cta: "ไปตรวจสลิปกันเล้ยย",
    url: `${SOLO_BASE}/dashboard?tab=finance&sub=jobs`,
  },
  portal_tracker_comment: {
    hook: "มีคอมเมนต์ใหม่ในงาน!!",
    cta: "ไปตอบลูกค้ากันต่อเล้ยย",
    url: `${SOLO_BASE}/dashboard?tab=finance&sub=jobs`,
  },
  portal_brief: {
    hook: "ลูกค้ายืนยันบรีฟแล้ว!!",
    cta: "ไปดูบรีฟแล้วลุยต่อเลยย",
    url: `${SOLO_BASE}/dashboard?tab=planner&sub=briefs`,
  },
  portal_planner: {
    hook: "ลูกค้าตอบคอนเทนต์แล้ว!!",
    cta: "ไปจัดการคอนเทนต์กันต่อเล้ยย",
    url: `${SOLO_BASE}/dashboard?tab=planner&sub=content`,
  },
  portal_quotation: {
    hook: "มีอัปเดตใบเสนอราคา!!",
    cta: "ไปดูใบเสนอราคากันต่อเล้ยย",
    url: `${SOLO_BASE}/dashboard?tab=finance&sub=quotations`,
  },
  anthem_hire: {
    hook: "มีงานใหม่เข้ามาแล้ว!!",
    cta: "ไปตอบคำขอจ้างกันเล้ยย",
    url: `${SOLO_BASE}/dashboard?tab=overview`,
  },
  anthem_chat: {
    hook: "มีข้อความใหม่ในแชท!!",
    cta: "ไปตอบแชทกันต่อเล้ยย",
    url: `${ANTHEM_BASE}/chat`,
  },
  anthem_job_match: {
    hook: "พบงานตรงสกิลของคุณ!!",
    cta: "ไปดูงานแล้วลุยต่อเลยย",
    url: `${ANTHEM_BASE}/jobs`,
  },
  billing: {
    hook: "อัปเดตการชำระเงินแล้ว",
    cta: "ไปดูบัญชีต่อได้เลยย",
    url: `${SOLO_BASE}/dashboard?tab=settings`,
  },
};

const SAMPLES = [
  { kind: "portal_slip", body: "คุณสมชาย อัปโหลดสลิปมัดจำ — Rebrand ร้านกาแฟ" },
  { kind: "portal_tracker_comment", body: "ลูกค้าแสดงความคิดเห็นในขั้นตอน Final Design" },
  { kind: "portal_brief", body: "บรีฟงานโปรเจกต์ Logo Sundae ครบถ้วน" },
  { kind: "portal_planner", body: "ลูกค้ากดอนุมัติโพสต์ IG รอบ 2" },
  { kind: "portal_quotation", body: "QT-2026-0042 — Rebrand ร้านกาแฟ" },
  { kind: "anthem_hire", body: "มีลูกค้าส่งคำขอจ้างงาน Logo Design" },
  { kind: "anthem_chat", body: "ลูกค้าส่งข้อความในแชทจ้างงาน" },
  { kind: "anthem_job_match", body: "พบงาน UI Design ที่ตรงกับทักษะของคุณ" },
  { kind: "billing", body: "ต่ออายุโปรสำเร็จ — ฿249" },
];

function formatPersonalLine(displayName, brandName) {
  const brand = brandName?.trim();
  const rawName = displayName?.trim();
  const name = rawName ? (rawName.startsWith("คุณ") ? rawName : `คุณ${rawName}`) : null;
  if (brand && name) return `${brand} (${name})`;
  if (brand) return brand;
  if (name) return name;
  return null;
}

function formatMessage(kind, body, personal) {
  const copy = KIND_COPY[kind];
  const lines = [copy.hook, "", HEADER, body, ""];
  const signoff = formatPersonalLine(personal?.displayName, personal?.brandName);
  if (signoff) lines.push(signoff);
  lines.push(copy.cta, copy.url);
  return lines.join("\n");
}

const args = process.argv.slice(2);
const recent = args.includes("--recent");
const userIdIdx = args.indexOf("--user-id");
const userIdArg = userIdIdx >= 0 ? args[userIdIdx + 1] : null;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!lineToken) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN — ใส่ใน Solo-Code/.env.line");
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
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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
  if (res.ok) return { ok: true };
  const body = await res.text();
  return { ok: false, error: `${res.status} ${body}` };
}

async function resolveUserId() {
  if (userIdArg) return userIdArg;
  if (!recent) {
    console.error("Pass --recent or --user-id <uuid>");
    process.exit(1);
  }
  const rows = await supabase(
    "profiles?select=user_id,line_linked_at&line_messaging_user_id=not.is.null&order=line_linked_at.desc&limit=1",
  );
  if (!rows?.[0]?.user_id) throw new Error("no_linked_profile");
  return rows[0].user_id;
}

async function main() {
  const userId = await resolveUserId();
  const profiles = await supabase(
    `profiles?select=line_messaging_user_id,subscription_tier,display_name,brand_name&user_id=eq.${userId}&limit=1`,
  );
  const profile = profiles?.[0];
  if (!profile?.line_messaging_user_id) throw new Error("line_not_linked");
  if (!PRO_TIERS.has(profile.subscription_tier ?? "free")) throw new Error("pro_required");

  console.log(`Sending ${SAMPLES.length} samples → ${profile.display_name ?? userId}`);

  let sent = 0;
  for (const sample of SAMPLES) {
    const text = formatMessage(sample.kind, sample.body, {
      displayName: profile.display_name,
      brandName: profile.brand_name,
    });
    const result = await pushLine(profile.line_messaging_user_id, text);
    if (!result.ok) {
      console.error(`Failed ${sample.kind}:`, result.error);
      continue;
    }
    sent++;
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`Done: sent ${sent}/${SAMPLES.length}`);
  if (sent === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

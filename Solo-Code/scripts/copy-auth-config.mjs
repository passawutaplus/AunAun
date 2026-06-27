#!/usr/bin/env node
/**
 * Copy Auth config (SMTP, OAuth providers, mailer) US → Singapore.
 * Also adds Google OAuth redirect URI note.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const solo = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";

function token() {
  for (const line of readFileSync(join(solo, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("SUPABASE_ACCESS_TOKEN missing");
}

async function getAuth(ref) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${ref} GET auth ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function patchAuth(ref, body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${ref} PATCH auth ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const PREFIXES = [
  "external_",
  "smtp_",
  "mailer_",
];

const SKIP = new Set([
  "uri_allow_list",
  "site_url",
  "hook_send_email_enabled",
  "hook_send_email_uri",
  "hook_send_email_secrets",
  "hook_custom_access_token_enabled",
  "hook_custom_access_token_uri",
  "hook_custom_access_token_secrets",
  "hook_mfa_verification_attempt_enabled",
  "hook_mfa_verification_attempt_uri",
  "hook_mfa_verification_attempt_secrets",
  "hook_password_verification_attempt_enabled",
  "hook_password_verification_attempt_uri",
  "hook_password_verification_attempt_secrets",
]);

function pickCopyFields(src) {
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (SKIP.has(k)) continue;
    if (!PREFIXES.some((p) => k.startsWith(p))) continue;
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

const urls = [
  "http://localhost:5173/**",
  "http://localhost:8080/**",
  "http://localhost:3000/**",
  "http://localhost:8081/**",
  "http://127.0.0.1:5173/**",
  "http://127.0.0.1:8080/**",
  "http://127.0.0.1:3000/**",
  "http://127.0.0.1:3090/**",
  "https://solofreelancer.com/**",
  "https://www.solofreelancer.com/**",
  "https://aplus1.app/**",
  "https://www.aplus1.app/**",
  "https://an1hem.app/**",
  "https://www.an1hem.app/**",
  "https://hq.solofreelancer.com/**",
  "https://aplus1-demo.vercel.app/**",
  "https://solo-demo.vercel.app/**",
  "https://solo-demo-liart.vercel.app/**",
].join(",");

const us = await getAuth(FROM);
const payload = {
  site_url: "https://www.solofreelancer.com",
  uri_allow_list: urls,
  ...pickCopyFields(us),
};

// Ensure email signup works like US until SMTP verified
payload.mailer_autoconfirm = us.mailer_autoconfirm ?? true;
payload.external_email_enabled = true;
payload.external_google_enabled = us.external_google_enabled ?? true;

console.log(`→ Copying ${Object.keys(payload).length} auth fields US → SG`);
const masked = { ...payload };
for (const k of Object.keys(masked)) {
  if (/secret|pass|key/i.test(k) && typeof masked[k] === "string" && masked[k].length > 8) {
    masked[k] = "***";
  }
}
writeFileSync(join(solo, "..", "backups", "auth-copy-payload-masked.json"), JSON.stringify(masked, null, 2));

await patchAuth(TO, payload);
console.log("✓ Auth config copied to", TO);

const sg = await getAuth(TO);
console.log("SG checks:");
console.log("  mailer_autoconfirm:", sg.mailer_autoconfirm);
console.log("  external_google_enabled:", sg.external_google_enabled);
console.log("  external_google_client_id:", sg.external_google_client_id ? "set" : "missing");
console.log("  smtp_host:", sg.smtp_host || "(empty — use autoconfirm or set SMTP in Dashboard)");
console.log("");
console.log("Google Cloud Console — add Authorized redirect URI:");
console.log(`  https://${TO}.supabase.co/auth/v1/callback`);

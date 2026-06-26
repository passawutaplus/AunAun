#!/usr/bin/env node
/**
 * Set Google OAuth client secret on Supabase Singapore.
 * Management API returns encrypted secrets — cannot copy US→SG via API.
 *
 * Usage:
 *   Add to Solo-Code/.env (never commit):
 *     GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
 *   node scripts/set-google-oauth-secret.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const solo = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = "zkflkpbmbozrchqncpzi";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(solo, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
const secret = env.GOOGLE_OAUTH_CLIENT_SECRET;
const clientId = env.GOOGLE_OAUTH_CLIENT_ID;

if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing in Solo-Code/.env");
if (!secret?.trim()) {
  console.error("GOOGLE_OAUTH_CLIENT_SECRET missing.");
  console.error("");
  console.error("1. Google Cloud Console → APIs & Services → Credentials");
  console.error("2. Open OAuth client (727912671200-...)");
  console.error("3. Copy Client secret (GOCSPX-...)");
  console.error("4. Add to Solo-Code/.env:");
  console.error("   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...");
  console.error("5. Re-run this script");
  process.exit(1);
}

const body = {
  external_google_enabled: true,
  external_google_secret: secret.trim(),
};
if (clientId?.trim()) body.external_google_client_id = clientId.trim();

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error("PATCH failed", res.status, text.slice(0, 400));
  process.exit(1);
}

console.log("✓ Google OAuth secret updated on", REF);
console.log("");
console.log("Also verify Google Cloud Console → Authorized redirect URIs includes:");
console.log(`  https://${REF}.supabase.co/auth/v1/callback`);
console.log("");
console.log("Then retry Google login on aplus1-demo.vercel.app/auth or solofreelancer.com/auth");

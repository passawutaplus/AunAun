#!/usr/bin/env node
/** Set edge function secrets on SG from Solo-Code/.env (skips SUPABASE_* reserved). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = "zkflkpbmbozrchqncpzi";

const SECRET_KEYS = [
  "GEMINI_API_KEY",
  "APLUS1_APP_URL",
  "ANTHEM_APP_URL",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "LINE_CONNECT_STATE_SECRET",
  "STRIPE_LIVE_API_KEY",
  "STRIPE_SANDBOX_API_KEY",
  "STRIPE_ENVIRONMENT",
  "PAYMENTS_LIVE_WEBHOOK_SECRET",
  "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "APLUS1_EMAIL_FROM",
  "APLUS1_EMAIL_SENDER_DOMAIN",
];

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
if (!env.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN required");

const pairs = [];
for (const key of SECRET_KEYS) {
  if (env[key]) pairs.push(`${key}=${env[key]}`);
}
if (!pairs.length) {
  console.log("No secrets to set");
  process.exit(0);
}

console.log(`→ Setting ${pairs.length} secrets on ${REF}`);
const cmd = `npx supabase secrets set ${pairs.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(" ")} --project-ref ${REF}`;
const r = spawnSync(cmd, {
  cwd: SOLO,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN },
});
process.exit(r.status ?? 1);

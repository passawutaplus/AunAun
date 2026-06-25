/**
 * Sync Solo-Code/.env to Vercel production (VITE_DEMO_MODE=false).
 * Usage: node scripts/sync-vercel-env-production.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const env = {};
const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

env.VITE_DEMO_MODE = "false";
env.VITE_SITE_URL = "https://solofreelancer.com";
env.VITE_EARLY_ACCESS = env.VITE_EARLY_ACCESS || "false";
env.STRIPE_USE_DIRECT = env.STRIPE_USE_DIRECT || "true";

const skip = new Set(["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"]);

for (const key of Object.keys(env)) {
  if (skip.has(key) || !env[key]) continue;
  const val = env[key];
  try {
    execFileSync(
      "npx vercel env add " + key + " production --value " + JSON.stringify(val) + " --yes --force",
      { cwd: root, stdio: "pipe", timeout: 120000, shell: true },
    );
    console.log(`OK ${key}`);
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message || "").slice(0, 200);
    console.log(`ERR ${key}: ${msg}`);
  }
}

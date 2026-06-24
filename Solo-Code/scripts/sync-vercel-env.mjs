/**
 * Sync Solo-Code/.env to Vercel (production + preview). Demo overrides applied.
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

env.VITE_DEMO_MODE = "true";
env.VITE_EARLY_ACCESS = env.VITE_EARLY_ACCESS || "false";
env.STRIPE_USE_DIRECT = env.STRIPE_USE_DIRECT || "true";
env.VITE_STRIPE_ENV = env.VITE_STRIPE_ENV || "sandbox";

const skip = new Set(["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "VITE_SITE_URL"]);

const keys = Object.keys(env).filter((k) => !skip.has(k) && env[k]);

for (const key of keys) {
  const val = env[key];
  for (const envName of ["production", "preview"]) {
    try {
      execFileSync("vercel", ["env", "add", key, envName, "--value", val, "--yes", "--force"], {
        cwd: root,
        stdio: "pipe",
        timeout: 120000,
      });
      console.log(`OK ${key} → ${envName}`);
    } catch (e) {
      const msg = (e.stderr?.toString() || e.message || "").slice(0, 300);
      console.log(`ERR ${key} → ${envName}: ${msg}`);
    }
  }
}

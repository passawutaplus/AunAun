#!/usr/bin/env node
/** Sync Solo-Code/.env → Vercel production for a named project (default: solo-demo = custom domain). */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const soloRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const project = process.argv[2] || "solo-demo";

const env = {};
for (const line of readFileSync(join(soloRoot, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}

env.VITE_DEMO_MODE = "false";
env.VITE_SITE_URL = "https://solofreelancer.com";

const skip = new Set(["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "US_SUPABASE_URL", "US_SUPABASE_SERVICE_ROLE_KEY"]);

console.log(`→ Link ${project} + sync production env`);
execFileSync(`npx vercel link --yes --project=${project}`, { cwd: soloRoot, shell: true, stdio: "inherit" });

for (const key of Object.keys(env)) {
  if (skip.has(key) || !env[key]) continue;
  try {
    execFileSync(
      `npx vercel env add ${key} production --value ${JSON.stringify(env[key])} --yes --force`,
      { cwd: soloRoot, shell: true, stdio: "pipe", timeout: 120000 },
    );
    console.log("OK", key);
  } catch (e) {
    console.log("ERR", key, (e.stderr?.toString() || "").slice(0, 100));
  }
}

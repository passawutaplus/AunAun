#!/usr/bin/env node
/** Redeploy Ops Hub (so1o-ops-hub.vercel.app). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const aplus1Url = env.VITE_APLUS1_APP_URL || env.VITE_ANTHEM_APP_URL || "https://aplus1.app";

const buildEnvs = [
  "--build-env",
  `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL}`,
  "--build-env",
  `VITE_SUPABASE_PUBLISHABLE_KEY=${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  "--build-env",
  `VITE_SUPABASE_PROJECT_ID=${env.VITE_SUPABASE_PROJECT_ID || "zkflkpbmbozrchqncpzi"}`,
  "--build-env",
  `VITE_SO1O_APP_URL=${env.VITE_SO1O_APP_URL || "https://www.solofreelancer.com"}`,
  "--build-env",
  `VITE_APLUS1_APP_URL=${aplus1Url}`,
  "--build-env",
  `VITE_ANTHEM_APP_URL=${aplus1Url}`,
];

console.log("→ Deploying so1o-ops-hub");
const r = spawnSync(
  "npx",
  ["vercel", "deploy", "--prod", "--yes", "--project=so1o-ops-hub", ...buildEnvs],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(r.status ?? 1);

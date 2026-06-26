#!/usr/bin/env node
/** Redeploy So1o production (solofreelancer.com → solo-demo). */
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
  "VITE_DEMO_MODE=false",
  "--build-env",
  `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL}`,
  "--build-env",
  `VITE_SUPABASE_PUBLISHABLE_KEY=${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  "--build-env",
  "VITE_SITE_URL=https://solofreelancer.com",
  "--build-env",
  `VITE_APLUS1_APP_URL=${aplus1Url}`,
  "--build-env",
  `VITE_ANTHEM_APP_URL=${aplus1Url}`,
  "--build-env",
  `VITE_OPS_HUB_URL=${env.VITE_OPS_HUB_URL || "https://so1o-ops-hub.vercel.app"}`,
  "--build-env",
  `VITE_EARLY_ACCESS=${env.VITE_EARLY_ACCESS || "false"}`,
  "--build-env",
  `STRIPE_USE_DIRECT=${env.STRIPE_USE_DIRECT || "true"}`,
];
if (env.VITE_SUPABASE_PROJECT_ID) {
  buildEnvs.push("--build-env", `VITE_SUPABASE_PROJECT_ID=${env.VITE_SUPABASE_PROJECT_ID}`);
}

console.log("→ Deploying solo-demo (production — solofreelancer.com)");
const r = spawnSync(
  "npx",
  ["vercel", "deploy", "--prod", "--yes", "--project=solo-demo", ...buildEnvs],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(r.status ?? 1);

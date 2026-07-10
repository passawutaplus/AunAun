#!/usr/bin/env node
/** Redeploy Aplus1 production (aplus1.app) — launch-minimal, payments off. */
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

const buildEnvs = [
  "--build-env",
  "DEPLOY_TARGET=production",
  "--build-env",
  "VITE_DEMO_MODE=false",
  "--build-env",
  `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL}`,
  "--build-env",
  `VITE_SUPABASE_PUBLISHABLE_KEY=${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  "--build-env",
  "VITE_SITE_URL=https://aplus1.app",
  "--build-env",
  `VITE_SO1O_APP_URL=${env.VITE_SO1O_APP_URL || "https://solofreelancer.com"}`,
  "--build-env",
  `VITE_OPS_HUB_URL=${env.VITE_OPS_HUB_URL || "https://so1o-ops-hub.vercel.app"}`,
  "--build-env",
  "VITE_APLUS1_LAUNCH_MINIMAL=true",
  "--build-env",
  "VITE_APLUS1_PAYMENTS_ENABLED=false",
  "--build-env",
  "VITE_SOLO_ECOSYSTEM_ENABLED=false",
  "--build-env",
  "VITE_STRIPE_MODE=sandbox",
];

console.log("→ Checking build env…");
const check = spawnSync("node", ["scripts/check-build-env.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DEPLOY_TARGET: "production", VITE_DEMO_MODE: "false", VITE_APLUS1_PAYMENTS_ENABLED: "false", VITE_SOLO_ECOSYSTEM_ENABLED: "false" },
});
if (check.status !== 0) process.exit(check.status ?? 1);

console.log("→ Deploying aplus1-prod (production — aplus1.app, launch-minimal)");
const r = spawnSync(
  "npx",
  ["vercel", "deploy", "--prod", "--yes", "--project=aplus1-prod", ...buildEnvs],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(r.status ?? 1);

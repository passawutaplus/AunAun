#!/usr/bin/env node
/** Redeploy Aplus1 demo (aplus1-demo.vercel.app). */
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
const demoUrl = env.VITE_DEMO_SUPABASE_URL || env.VITE_SUPABASE_URL;
const demoKey = env.VITE_DEMO_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const buildEnvs = [
  "--build-env",
  "DEPLOY_TARGET=demo",
  "--build-env",
  `VITE_DEMO_SUPABASE_URL=${demoUrl}`,
  "--build-env",
  `VITE_DEMO_SUPABASE_PUBLISHABLE_KEY=${demoKey}`,
  "--build-env",
  "VITE_DEMO_MODE=true",
  "--build-env",
  "VITE_APLUS1_PAYMENTS_ENABLED=true",
  "--build-env",
  "VITE_STRIPE_MODE=sandbox",
  "--build-env",
  `VITE_SO1O_APP_URL=${env.VITE_SO1O_APP_URL || "https://solofreelancer.com"}`,
  "--build-env",
  `VITE_OPS_HUB_URL=${env.VITE_OPS_HUB_URL || "https://so1o-ops-hub.vercel.app"}`,
];
const aplus1Url = env.VITE_APLUS1_APP_URL || env.VITE_ANTHEM_APP_URL;
if (aplus1Url) {
  buildEnvs.push("--build-env", `VITE_APLUS1_APP_URL=${aplus1Url}`);
  buildEnvs.push("--build-env", `VITE_ANTHEM_APP_URL=${aplus1Url}`);
}

console.log("→ Deploying aplus1-demo (demo — aplus1-demo.vercel.app)");
const r = spawnSync(
  "npx",
  ["vercel", "deploy", "--prod", "--yes", "--project=aplus1-demo", ...buildEnvs],
  { cwd: root, stdio: "pipe", shell: true, encoding: "utf8" },
);
const out = (r.stdout || "") + (r.stderr || "");
if (r.status === 0) {
  const m = out.match(/https:\/\/aplus1-demo-[a-z0-9]+-passawutaplus-9338s-projects\.vercel\.app/);
  if (m) {
    console.log("→ Aliasing aplus1-demo.vercel.app …");
    spawnSync("npx", ["vercel", "alias", "set", m[0], "aplus1-demo.vercel.app"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
  }
}
process.stdout.write(out);
process.exit(r.status ?? 1);

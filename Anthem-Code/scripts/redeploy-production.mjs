#!/usr/bin/env node
/**
 * Redeploy Aplus1 production (aplus1.app).
 * OAuth uses window.location.origin when VITE_SITE_URL unset on preview.
 */
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
  "VITE_DEMO_MODE=false",
  "--build-env",
  `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL}`,
  "--build-env",
  `VITE_SUPABASE_PUBLISHABLE_KEY=${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  "--build-env",
  "VITE_SITE_URL=https://aplus1.app",
];

console.log("→ Deploying aplus1-prod (production — aplus1.app)");
const r = spawnSync(
  "npx",
  ["vercel", "deploy", "--prod", "--yes", "--project=aplus1-prod", ...buildEnvs],
  { cwd: root, stdio: "pipe", shell: true, encoding: "utf8" },
);
const out = (r.stdout || "") + (r.stderr || "");
if (r.status === 0) {
  const m = out.match(/https:\/\/aplus1-prod-[a-z0-9]+-passawutaplus-9338s-projects\.vercel\.app/);
  if (m) {
    for (const host of ["aplus1.app", "www.aplus1.app"]) {
      console.log(`→ Aliasing ${host} …`);
      spawnSync("npx", ["vercel", "alias", "set", m[0], host], {
        cwd: root,
        stdio: "inherit",
        shell: true,
      });
    }
  }
}
process.stdout.write(out);
process.exit(r.status ?? 1);

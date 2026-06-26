#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const solo = parseEnv(join(root, "Solo-Code/.env"));
const anthemEnv = join(root, "Anthem-Code/.env");

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const entries = {
  VITE_SUPABASE_URL: solo.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: solo.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: solo.VITE_SUPABASE_PROJECT_ID || "zkflkpbmbozrchqncpzi",
  VITE_DEMO_MODE: "false",
  VITE_OPS_HUB_URL: solo.VITE_OPS_HUB_URL || "https://hq.solofreelancer.com",
};

let text = readFileSync(anthemEnv, "utf8").replace(/^\uFEFF/, "");
for (const [key, value] of Object.entries(entries)) {
  if (!value) continue;
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  text = re.test(text) ? text.replace(re, line) : text.trimEnd() + "\n" + line + "\n";
}
writeFileSync(anthemEnv, text, "utf8");
console.log("Wrote Anthem-Code/.env");

for (const [key, value] of Object.entries(entries)) {
  if (!value) continue;
  try {
    execFileSync(`npx vercel env add ${key} production --value ${JSON.stringify(value)} --yes --force`, {
      cwd: join(root, "Anthem-Code"),
      shell: true,
      stdio: "pipe",
      timeout: 120000,
    });
    console.log("OK", key);
  } catch (e) {
    console.log("ERR", key, (e.stderr?.toString() || e.message || "").slice(0, 120));
  }
}

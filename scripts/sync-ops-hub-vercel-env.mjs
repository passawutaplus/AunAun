#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const solo = parseEnv(join(root, "Solo-Code/.env"));
const opsEnv = join(root, "Ops-Hub/.env");

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const content = [
  `VITE_SUPABASE_URL=${solo.VITE_SUPABASE_URL}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${solo.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  `VITE_SUPABASE_PROJECT_ID=${solo.VITE_SUPABASE_PROJECT_ID}`,
  "VITE_SO1O_APP_URL=https://www.solofreelancer.com",
  "VITE_APLUS1_APP_URL=https://aplus1.app",
].join("\n");

writeFileSync(opsEnv, content + "\n");
console.log("Wrote Ops-Hub/.env");

for (const line of content.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  try {
    execFileSync(`npx vercel env add ${m[1]} production --value ${JSON.stringify(m[2])} --yes --force`, {
      cwd: join(root, "Ops-Hub"),
      shell: true,
      stdio: "pipe",
    });
    console.log("OK", m[1]);
  } catch (e) {
    console.log("ERR", m[1], (e.stderr?.toString() || "").slice(0, 100));
  }
}

#!/usr/bin/env node
/** Production deploy with SUPABASE_ACCESS_TOKEN from Solo-Code/.env */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOLO = join(REPO, "Solo-Code");

function loadToken() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("SUPABASE_ACCESS_TOKEN missing");
}

const app = process.argv[2];
if (!app) {
  console.log("Usage: node scripts/deploy-production.mjs solo|1px|ops");
  process.exit(1);
}

const env = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: loadToken(),
  SUPABASE_PROJECT_REF: "zkflkpbmbozrchqncpzi",
};

const bash = "C:\\Program Files\\Git\\bin\\bash.exe";
const script =
  app === "ops"
    ? `cd "${join(REPO, "Ops-Hub")}" && npx vercel deploy --prod --yes --project=so1o-ops-hub`
    : `cd "${REPO}" && ./scripts/deploy-vercel.sh production ${app === "1px" ? "1px" : "solo"}`;

console.log("→", script);
const r = spawnSync(bash, ["-lc", script], { stdio: "inherit", env });
process.exit(r.status ?? 1);

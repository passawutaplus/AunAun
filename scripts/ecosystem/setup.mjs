#!/usr/bin/env node
/**
 * Syncs ecosystem env vars across Solo-Code + Anthem-Code (.env).
 * Unified project rvnzjiskqliexysicfmh: ANTHEM_SUPABASE_URL = SUPABASE_URL (sync optional).
 * Run: node scripts/ecosystem/setup.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const soloEnv = join(root, "Solo-Code/.env");
const anthemEnv = join(root, "Anthem-Code/.env");

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function upsertEnv(path, entries) {
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const [key, value] of Object.entries(entries)) {
    if (!value) continue;
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text = text.trimEnd() + (text.endsWith("\n") || text === "" ? "" : "\n") + line + "\n";
  }
  writeFileSync(path, text);
}

const anthem = parseEnv(anthemEnv);
const solo = parseEnv(soloEnv);

const soloUrl = solo.SUPABASE_URL || solo.VITE_SUPABASE_URL;
const anthemUrl = anthem.VITE_SUPABASE_URL || anthem.SUPABASE_URL || soloUrl;
let secret = solo.ECOSYSTEM_SYNC_SECRET;
if (!secret) {
  secret = randomBytes(24).toString("hex");
}

const toSolo = {
  ANTHEM_SUPABASE_URL: anthemUrl,
  ECOSYSTEM_SYNC_SECRET: secret,
  VITE_ANTHEM_APP_URL: solo.VITE_ANTHEM_APP_URL || "http://localhost:8081/",
};

const toAnthem = {
  VITE_SUPABASE_URL: anthemUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: solo.VITE_SUPABASE_PUBLISHABLE_KEY || anthem.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: solo.VITE_SUPABASE_PROJECT_ID || anthem.VITE_SUPABASE_PROJECT_ID || "rvnzjiskqliexysicfmh",
  VITE_SO1O_APP_URL: anthem.VITE_SO1O_APP_URL || "http://localhost:3000",
};

upsertEnv(soloEnv, toSolo);
upsertEnv(anthemEnv, toAnthem);

console.log("\n=== Ecosystem setup (local .env) ===\n");
console.log("Updated Solo-Code/.env:");
console.log("  ANTHEM_SUPABASE_URL =", anthemUrl || "(missing — set Anthem .env first)");
console.log("  ECOSYSTEM_SYNC_SECRET = (generated or kept existing)\n");

console.log("Updated Anthem-Code/.env with unified Supabase URL (if keys present in Solo .env)\n");

console.log("--- Supabase (rvnzjiskqliexysicfmh) ---\n");
console.log("1) Push migrations: Solo-Code/scripts/supabase-push-via-api.sh");
console.log("2) SQL Editor: Solo-Code/supabase/manual/apply-anthem-ecosystem.sql");
console.log("3) Deploy edge functions: embed-project, similar-images, generate-contract, job-match-dispatch");
console.log("4) See Solo-Code/supabase/ECOSYSTEM.md\n");

if (soloUrl && anthemUrl && soloUrl.replace(/\/$/, "") === anthemUrl.replace(/\/$/, "")) {
  console.log("✓ Unified project — Pro tier is shared via public.profiles (no sync-so1o-tier needed).\n");
}

if (!solo.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠ Solo-Code/.env has no SUPABASE_SERVICE_ROLE_KEY — Stripe webhook cannot sync tiers until set.\n");
}

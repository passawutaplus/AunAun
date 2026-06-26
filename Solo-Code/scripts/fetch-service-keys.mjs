#!/usr/bin/env node
/** Fetch US + SG service role keys via Management API and upsert into Solo-Code/.env */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const US = "rvnzjiskqliexysicfmh";
const SG = "zkflkpbmbozrchqncpzi";

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function serviceKey(ref) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const keys = await res.json();
  const sr = keys.find((k) => k.name === "service_role");
  if (!sr?.api_key) throw new Error(`no service_role for ${ref}`);
  return sr.api_key;
}

function upsert(path, entries) {
  let text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : text.trimEnd() + "\n" + line + "\n";
  }
  writeFileSync(path, text, "utf8");
}

const usKey = await serviceKey(US);
const sgKey = await serviceKey(SG);
upsert(join(SOLO, ".env"), {
  US_SUPABASE_SERVICE_ROLE_KEY: usKey,
  US_SUPABASE_URL: `https://${US}.supabase.co`,
  SG_SUPABASE_SERVICE_ROLE_KEY: sgKey,
  SG_SUPABASE_URL: `https://${SG}.supabase.co`,
});
console.log("✓ US + SG service role keys saved to Solo-Code/.env (gitignored)");

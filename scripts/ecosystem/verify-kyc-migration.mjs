#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const soloEnv = join(root, "Solo-Code", ".env");

function loadEnv(path) {
  if (!existsSync(path)) return;
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(soloEnv);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

const checks = [
  ["legal_name column", "SELECT column_name FROM information_schema.columns WHERE table_schema='shared' AND table_name='kyc_requests' AND column_name='legal_name'"],
  ["kyc_documents table", "SELECT to_regclass('shared.kyc_documents') AS t"],
  ["payout_profiles table", "SELECT to_regclass('shared.payout_profiles') AS t"],
  ["submit_kyc_verification", "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='submit_kyc_verification'"],
];

let failed = 0;
for (const [label, sql] of checks) {
  const r = await q(sql);
  const pass = r.ok && !r.body.includes('"error"') && r.body !== "[]";
  console.log(pass ? "✓" : "✗", label, r.ok ? "" : `HTTP ${r.status}`, r.body.slice(0, 120));
  if (!pass) failed++;
}

process.exit(failed ? 1 : 0);

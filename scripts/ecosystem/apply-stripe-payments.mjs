#!/usr/bin/env node
/** Apply scripts/ecosystem/stripe-payments.sql on remote Supabase. */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const monoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPaths = [
  join(monoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(monoRoot, "Solo-Code", ".env"),
  join(monoRoot, "Anthem-Code", ".env"),
];

for (const p of envPaths) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const SQL_PATH = join(monoRoot, "scripts", "ecosystem", "stripe-payments.sql");

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing SUPABASE_ACCESS_TOKEN — run: supabase login");
    process.exit(1);
  }

  const sql = readFileSync(SQL_PATH, "utf8");
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Apply failed:", res.status, text);
    process.exit(1);
  }
  console.log("✓ Applied stripe-payments.sql");
  if (text && text !== "[]") console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

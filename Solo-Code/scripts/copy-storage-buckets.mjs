#!/usr/bin/env node
/** Copy storage.buckets rows from US → SG via Management API. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function q(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 400));
  return text ? JSON.parse(text) : [];
}

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const buckets = await q(FROM, "SELECT * FROM storage.buckets ORDER BY id");
console.log(`Copying ${buckets.length} buckets to ${TO}`);
for (const b of buckets) {
  const cols = Object.keys(b);
  const sql = `INSERT INTO storage.buckets (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => lit(b[c])).join(", ")}) ON CONFLICT (id) DO NOTHING`;
  try {
    await q(TO, sql);
    console.log("✓", b.id);
  } catch (e) {
    console.log("✗", b.id, e.message.slice(0, 120));
  }
}

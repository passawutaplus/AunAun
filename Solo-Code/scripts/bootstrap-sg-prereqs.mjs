#!/usr/bin/env node
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

async function main() {
  for (const sql of [
    "CREATE EXTENSION IF NOT EXISTS vector",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
  ]) {
    try {
      await q(TO, sql);
      console.log("✓", sql);
    } catch (e) {
      console.log("ext", e.message.slice(0, 120));
    }
  }

  const enums = await q(
    FROM,
    `SELECT n.nspname AS schema, t.typname AS type_name, e.enumlabel, e.enumsortorder
     FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     JOIN pg_namespace n ON t.typnamespace = n.oid
     WHERE n.nspname IN ('public','shared','anthem','so1o','ops')
     ORDER BY n.nspname, t.typname, e.enumsortorder`,
  );
  const grouped = new Map();
  for (const r of enums) {
    const k = `${r.schema}.${r.type_name}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(r.enumlabel);
  }
  for (const [k, labels] of grouped) {
    const [schema, typeName] = k.split(".");
    const labelsSql = labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(", ");
    const sql = `DO $$ BEGIN CREATE TYPE ${schema}.${typeName} AS ENUM (${labelsSql}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
    try {
      await q(TO, sql);
      console.log("✓ enum", k);
    } catch (e) {
      console.log("✗ enum", k, e.message.slice(0, 80));
    }
  }

  const fn = await q(
    FROM,
    `SELECT pg_get_functiondef(p.oid) AS def
     FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public' AND p.proname = 'gen_tracking_code' LIMIT 1`,
  );
  if (fn[0]?.def) {
    try {
      await q(TO, fn[0].def);
      console.log("✓ gen_tracking_code");
    } catch (e) {
      console.log("✗ fn", e.message.slice(0, 120));
    }
  }

  const seqs = await q(
    FROM,
    `SELECT sequence_schema, sequence_name FROM information_schema.sequences
     WHERE sequence_schema IN ('public','anthem','shared')`,
  );
  for (const s of seqs) {
    try {
      await q(TO, `CREATE SEQUENCE IF NOT EXISTS ${s.sequence_schema}.${s.sequence_name}`);
    } catch {
      /* ignore */
    }
  }
  console.log(`✓ sequences (${seqs.length})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

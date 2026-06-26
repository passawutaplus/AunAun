#!/usr/bin/env node
/**
 * Clone US → Singapore via Supabase Management API (postgres superuser).
 * Usage:
 *   node scripts/clone-via-management-api.mjs schema
 *   node scripts/clone-via-management-api.mjs data [--dry-run]
 *   node scripts/clone-via-management-api.mjs auth
 *   node scripts/clone-via-management-api.mjs verify
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";
const SCHEMAS = ["public", "shared", "anthem", "so1o", "ops"];

function token() {
  const raw = readFileSync(join(SOLO_ROOT, ".env"), "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("SUPABASE_ACCESS_TOKEN missing");
}

async function q(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${ref} ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}

function lit(v, colHint = "") {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const inner = v.map((x) => (x === null ? "NULL" : `'${String(x).replace(/'/g, "''")}'`)).join(", ");
    const cast = colHint.includes("int") ? "integer[]" : "text[]";
    return `ARRAY[${inner}]::${cast}`;
  }
  if (typeof v === "object") {
    if (Object.prototype.toString.call(v) === "[object Object]") {
      return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    }
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function listTables(ref) {
  return q(
    ref,
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema IN (${SCHEMAS.map((s) => `'${s}'`).join(",")})
       AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`,
  );
}

async function tableExists(ref, schema, table) {
  const rows = await q(
    ref,
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema='${schema}' AND table_name='${table}' LIMIT 1`,
  );
  return rows.length > 0;
}

async function createSchemaShells() {
  for (const s of SCHEMAS) {
    if (s === "public") continue;
    try {
      await q(TO, `CREATE SCHEMA IF NOT EXISTS ${s}`);
      console.log(`✓ schema ${s}`);
    } catch (e) {
      console.log(`schema ${s}: ${e.message.slice(0, 120)}`);
    }
  }
}

async function cloneEnums() {
  const rows = await q(
    FROM,
    `SELECT n.nspname AS schema, t.typname AS type_name, e.enumlabel, e.enumsortorder
     FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     JOIN pg_namespace n ON t.typnamespace = n.oid
     WHERE n.nspname IN (${SCHEMAS.map((s) => `'${s}'`).join(",")})
     ORDER BY n.nspname, t.typname, e.enumsortorder`,
  );
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.schema}.${row.type_name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row.enumlabel);
  }
  for (const [key, labels] of grouped) {
    const [schema, typeName] = key.split(".");
    const labelsSql = labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(", ");
    const sql = `DO $$ BEGIN CREATE TYPE ${schema}.${typeName} AS ENUM (${labelsSql}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
    try {
      await q(TO, sql);
      console.log(`  ✓ type ${key}`);
    } catch (e) {
      console.log(`  ✗ type ${key}: ${e.message.slice(0, 120)}`);
    }
  }
}

async function cloneTableDefinition(schema, table) {
  const cols = await q(
    FROM,
    `SELECT
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS pg_type,
       a.attnotnull AS notnull,
       pg_get_expr(ad.adbin, ad.adrelid) AS column_default
     FROM pg_attribute a
     LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = '${schema}' AND c.relname = '${table}'
       AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`,
  );
  if (!cols.length) return;

  const parts = cols.map((c) => {
    let line = `"${c.column_name}" ${c.pg_type}`;
    if (c.notnull) line += " NOT NULL";
    if (c.column_default) line += ` DEFAULT ${c.column_default}`;
    return line;
  });

  const ddl = `CREATE TABLE IF NOT EXISTS ${schema}."${table}" (\n  ${parts.join(",\n  ")}\n)`;
  await q(TO, ddl);
}

async function cloneSchema() {
  await createSchemaShells();
  console.log("Copying enum types...");
  await cloneEnums();
  const tables = await listTables(FROM);
  console.log(`Creating ${tables.length} tables on ${TO}...`);
  for (const { table_schema, table_name } of tables) {
    try {
      if (await tableExists(TO, table_schema, table_name)) {
        console.log(`  skip ${table_schema}.${table_name} (exists)`);
        continue;
      }
      await cloneTableDefinition(table_schema, table_name);
      console.log(`  ✓ ${table_schema}.${table_name}`);
    } catch (e) {
      console.log(`  ✗ ${table_schema}.${table_name}: ${e.message.slice(0, 160)}`);
    }
  }
}

async function copyTableData(schema, table, dryRun) {
  const fq = `${schema}."${table}"`;
  const rows = await q(FROM, `SELECT * FROM ${fq}`);
  if (!rows.length) return 0;
  if (dryRun) {
    console.log(`  ${schema}.${table}: ${rows.length} rows (dry-run)`);
    return rows.length;
  }
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  let n = 0;
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    const values = batch.map((row) => `(${cols.map((c) => lit(row[c], c)).join(", ")})`).join(", ");
    const sql = `INSERT INTO ${fq} (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`;
    try {
      await q(TO, sql);
      n += batch.length;
    } catch (e) {
      console.log(`  ✗ ${schema}.${table} batch: ${e.message.slice(0, 160)}`);
    }
  }
  console.log(`  ${schema}.${table}: ${n}/${rows.length}`);
  return n;
}

async function cloneData(dryRun) {
  const tables = await listTables(FROM);
  console.log(`Copying data for ${tables.length} tables...`);
  for (const { table_schema, table_name } of tables) {
    try {
      await copyTableData(table_schema, table_name, dryRun);
    } catch (e) {
      console.log(`  ✗ ${table_schema}.${table_name}: ${e.message.slice(0, 160)}`);
    }
  }
}

async function cloneAuth() {
  const users = await q(FROM, "SELECT * FROM auth.users ORDER BY created_at");
  console.log(`Copying ${users.length} auth.users...`);
  for (const u of users) {
    const cols = Object.keys(u);
    const sql = `INSERT INTO auth.users (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => lit(u[c])).join(", ")}) ON CONFLICT (id) DO NOTHING`;
    try {
      await q(TO, sql);
    } catch (e) {
      console.log(`  ✗ ${u.id}: ${e.message.slice(0, 120)}`);
    }
  }
  try {
    const identities = await q(FROM, "SELECT * FROM auth.identities");
    console.log(`Copying ${identities.length} auth.identities...`);
    for (const row of identities) {
      const cols = Object.keys(row);
      const sql = `INSERT INTO auth.identities (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => lit(row[c])).join(", ")}) ON CONFLICT DO NOTHING`;
      try {
        await q(TO, sql);
      } catch (e) {
        console.log(`  ✗ identity: ${e.message.slice(0, 100)}`);
      }
    }
  } catch (e) {
    console.log("identities:", e.message.slice(0, 120));
  }
}

async function verify() {
  const checks = [
    ["auth.users", `SELECT count(*)::int AS n FROM auth.users`],
    ["public.profiles", `SELECT count(*)::int AS n FROM public.profiles`],
    ["anthem.projects", `SELECT count(*)::int AS n FROM anthem.projects`],
    ["shared.wallets", `SELECT count(*)::int AS n FROM shared.wallets`],
  ];
  console.log("\nUS → SG counts:");
  for (const [label, sql] of checks) {
    const a = await q(FROM, sql);
    const b = await q(TO, sql);
    console.log(`  ${label}: ${a[0]?.n} → ${b[0]?.n}`);
  }
}

const cmd = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
try {
  if (cmd === "schema") await cloneSchema();
  else if (cmd === "data") await cloneData(dryRun);
  else if (cmd === "auth") await cloneAuth();
  else if (cmd === "verify") await verify();
  else {
    console.log("Usage: node scripts/clone-via-management-api.mjs schema|data|auth|verify");
    process.exit(1);
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}

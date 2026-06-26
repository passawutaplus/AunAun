#!/usr/bin/env node
/**
 * Copy database schema markers + data from US → Singapore via Management API.
 * Requires SUPABASE_ACCESS_TOKEN in Solo-Code/.env
 *
 * Usage:
 *   node scripts/copy-database-via-api.mjs schema-snapshot
 *   node scripts/copy-database-via-api.mjs copy-data [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOLO_ROOT = join(__dirname, "..");
const OLD_REF = "rvnzjiskqliexysicfmh";
const NEW_REF = "zkflkpbmbozrchqncpzi";
const SCHEMAS = ["public", "shared", "anthem", "so1o", "ops"];

function loadToken() {
  const raw = readFileSync(join(SOLO_ROOT, ".env"), "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("SUPABASE_ACCESS_TOKEN missing in Solo-Code/.env");
}

async function query(ref, sql, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${ref} ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : [];
}

async function listTables(ref, token) {
  const sql = `
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN (${SCHEMAS.map((s) => `'${s}'`).join(",")})
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_schema, table_name`;
  return query(ref, sql, token);
}

async function copyTableData(fromRef, toRef, token, schema, table, dryRun) {
  const fq = `${schema}.${table}`;
  const rows = await query(fromRef, `SELECT * FROM ${fq}`, token);
  if (!rows.length) {
    console.log(`  ${fq}: 0 rows (skip)`);
    return 0;
  }
  if (dryRun) {
    console.log(`  ${fq}: ${rows.length} rows (dry-run)`);
    return rows.length;
  }

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch
      .map((row) => {
        const vals = cols.map((c) => sqlLiteral(row[c]));
        return `(${vals.join(", ")})`;
      })
      .join(",\n");
    const sql = `INSERT INTO ${fq} (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`;
    try {
      await query(toRef, sql, token);
      inserted += batch.length;
    } catch (e) {
      console.log(`  ✗ ${fq} batch @${i}: ${e.message.slice(0, 200)}`);
    }
  }
  console.log(`  ${fq}: ${inserted}/${rows.length} rows`);
  return inserted;
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function copyAuthUsers(fromRef, toRef, token, dryRun) {
  const users = await query(fromRef, "SELECT * FROM auth.users ORDER BY created_at", token);
  console.log(`auth.users source: ${users.length}`);
  if (dryRun) return;

  for (const u of users) {
    const cols = Object.keys(u);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const vals = cols.map((c) => sqlLiteral(u[c])).join(", ");
    const sql = `INSERT INTO auth.users (${colList}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING`;
    try {
      await query(toRef, sql, token);
    } catch (e) {
      console.log(`  ✗ user ${u.id}: ${e.message.slice(0, 160)}`);
    }
  }
}

async function schemaSnapshot() {
  const token = loadToken();
  const tables = await listTables(OLD_REF, token);
  const out = join(SOLO_ROOT, "..", "backups", `tables-${OLD_REF}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(tables, null, 2));
  console.log(`Saved ${tables.length} tables → ${out}`);
}

async function copyData(dryRun) {
  const token = loadToken();
  const tables = await listTables(OLD_REF, token);
  console.log(`Copying ${tables.length} tables US → SG${dryRun ? " (dry-run)" : ""}`);

  await copyAuthUsers(OLD_REF, NEW_REF, token, dryRun);

  for (const { table_schema, table_name } of tables) {
    if (table_schema === "public" && table_name === "schema_migrations") continue;
    await copyTableData(OLD_REF, NEW_REF, token, table_schema, table_name, dryRun);
  }
}

async function cloneSchemaViaDumpSql() {
  const token = loadToken();
  // Copy migration history + use US as source of truth for schema via pg_dump alternative:
  // Export CREATE SCHEMA statements
  const schemas = await query(
    OLD_REF,
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('shared','anthem','so1o','ops')`,
    token,
  );
  console.log("Existing schemas on US:", schemas.map((r) => r.schema_name).join(", "));

  for (const { schema_name } of schemas) {
    try {
      await query(NEW_REF, `CREATE SCHEMA IF NOT EXISTS ${schema_name}`, token);
      console.log(`✓ schema ${schema_name}`);
    } catch (e) {
      console.log(`schema ${schema_name}: ${e.message.slice(0, 120)}`);
    }
  }
}

const cmd = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

try {
  switch (cmd) {
    case "schema-snapshot":
      await schemaSnapshot();
      break;
    case "clone-schemas":
      await cloneSchemaViaDumpSql();
      break;
    case "copy-data":
      await copyData(dryRun);
      break;
    default:
      console.log("Usage: node scripts/copy-database-via-api.mjs schema-snapshot|clone-schemas|copy-data [--dry-run]");
      process.exit(1);
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}

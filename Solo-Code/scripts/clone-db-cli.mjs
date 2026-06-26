#!/usr/bin/env node
/**
 * Full DB clone US → SG using Supabase CLI login role + pg_dump/pg_restore.
 * Requires: Supabase CLI (npx), Git Bash pg_dump/pg_restore OR Docker.
 *
 * Usage:
 *   node scripts/clone-db-cli.mjs dump
 *   node scripts/clone-db-cli.mjs restore
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOLO_ROOT = join(__dirname, "..");
const REPO_ROOT = join(SOLO_ROOT, "..");
const OLD_REF = "rvnzjiskqliexysicfmh";
const NEW_REF = "zkflkpbmbozrchqncpzi";
const DUMP_SCHEMAS = ["public", "shared", "anthem", "so1o", "ops", "supabase_migrations"];
const BACKUP_DIR = join(REPO_ROOT, "backups", "db");

function loadEnv() {
  const env = { ...process.env };
  const raw = readFileSync(join(SOLO_ROOT, ".env"), "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function ensurePostgresPassword(ref, env, tempPassword) {
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN required");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `ALTER USER postgres WITH PASSWORD '${tempPassword.replace(/'/g, "''")}'` }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ALTER USER on ${ref} failed (${res.status}): ${text.slice(0, 300)}`);
}

function resolveDbPassword(env, ref) {
  if (ref === OLD_REF) {
    return env.MIGRATION_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || null;
  }
  return env.MIGRATION_DB_PASSWORD || env.SG_SUPABASE_DB_PASSWORD || null;
}

async function resolveCredentials(ref, env) {
  const password = resolveDbPassword(env, ref);
  if (password) {
    return { host: `db.${ref}.supabase.co`, port: "5432", user: "postgres", password, database: "postgres" };
  }
  console.log(`→ Using Supabase CLI login role for ${ref}`);
  return parseDryRunCredentials(ref, env);
}

function findPgBin(name) {
  const candidates = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\" + name + ".exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\" + name + ".exe",
  ];
  for (const c of candidates) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

function parseDryRunCredentials(projectRef, env) {
  spawnSync("npx", ["supabase", "link", "--project-ref", projectRef, "--yes"], {
    cwd: SOLO_ROOT,
    encoding: "utf8",
    shell: true,
    env: { ...env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN },
  });
  const dry = spawnSync("npx", ["supabase", "db", "dump", "--linked", "--dry-run"], {
    cwd: SOLO_ROOT,
    encoding: "utf8",
    shell: true,
    env: { ...env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN },
  });
  const text = String(dry.stdout || "") + String(dry.stderr || "");
  const host = text.match(/PGHOST="([^"]+)"/)?.[1];
  const port = text.match(/PGPORT="([^"]+)"/)?.[1] || "5432";
  const user = text.match(/PGUSER="([^"]+)"/)?.[1];
  const password = text.match(/PGPASSWORD="([^"]+)"/)?.[1];
  const database = text.match(/PGDATABASE="([^"]+)"/)?.[1] || "postgres";
  if (!host || !user || !password) throw new Error("Could not parse CLI login credentials from supabase db dump --dry-run");
  return { host, port, user, password, database };
}

function latestDump() {
  if (!existsSync(BACKUP_DIR)) return null;
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.includes(OLD_REF) && (f.endsWith(".dump") || f.endsWith(".sql")))
    .map((f) => join(BACKUP_DIR, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] || null;
}

async function dump() {
  const env = loadEnv();
  if (!env.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN required");

  const pgDump = findPgBin("pg_dump");
  if (!pgDump) throw new Error("pg_dump not found — install PostgreSQL 17 client");

  const creds = await resolveCredentials(OLD_REF, env);
  mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const out = join(BACKUP_DIR, `${OLD_REF}-${ts}.dump`);
  console.log(`→ pg_dump ${OLD_REF} → ${out}`);
  const schemaArgs = DUMP_SCHEMAS.flatMap((s) => ["--schema", s]);
  const includeAuth = creds.user === "postgres";
  const extraSchemas = includeAuth ? ["--schema", "auth", "--schema", "storage"] : [];
  if (!includeAuth) {
    console.log("  (skipping auth/storage — CLI login role lacks permission; copy auth via Management API)");
  }
  const r = spawnSync(
    pgDump,
    [
      "-Fc",
      "-h",
      creds.host,
      "-p",
      creds.port,
      "-U",
      creds.user,
      "-d",
      creds.database,
      ...extraSchemas,
      ...schemaArgs,
      "-f",
      out,
    ],
    {
      stdio: "inherit",
      env: { ...env, PGPASSWORD: creds.password },
    },
  );
  if (r.status !== 0) throw new Error(`pg_dump failed (${r.status})`);
  console.log("✓", out);
}

async function restore() {
  const env = loadEnv();
  if (!env.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN required");
  const dumpFile = latestDump();
  if (!dumpFile) throw new Error("No dump file in backups/db");

  const pgRestore = findPgBin("pg_restore");
  if (!pgRestore) throw new Error("pg_restore not found");

  const creds = await resolveCredentials(NEW_REF, env);

  console.log(`→ pg_restore ${dumpFile} → ${NEW_REF}`);
  const r = spawnSync(
    pgRestore,
    [
      "-h",
      creds.host,
      "-p",
      creds.port,
      "-U",
      creds.user,
      "-d",
      creds.database,
      "--clean",
      "--if-exists",
      "--no-owner",
      "--role=postgres",
      dumpFile,
    ],
    {
      stdio: "inherit",
      env: { ...env, PGPASSWORD: creds.password },
    },
  );
  if (r.status !== 0) {
    console.log("⚠ pg_restore returned", r.status, "(some errors may be benign on Supabase)");
  } else {
    console.log("✓ restore complete");
  }
}

const cmd = process.argv[2];
try {
  if (cmd === "dump") await dump();
  else if (cmd === "restore") await restore();
  else {
    console.log("Usage: node scripts/clone-db-cli.mjs dump|restore");
    process.exit(1);
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}

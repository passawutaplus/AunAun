#!/usr/bin/env node
/**
 * Push pending Solo-Code migrations via Supabase Management API.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF || "rvnzjiskqliexysicfmh";
const token = process.env.SUPABASE_ACCESS_TOKEN;
import { fileURLToPath } from "node:url";
const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const migDir =
  process.env.MIGRATIONS_DIR || join(repoRoot, "Solo-Code", "supabase", "migrations");

if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${projectRef}`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function apiPost(path, body) {
  const res = await fetch(`${api}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

console.log("Fetching applied migrations...");
const appliedRows = await apiPost("/database/query", {
  query: "SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;",
});
const applied = new Set(
  (Array.isArray(appliedRows) ? appliedRows : []).map((r) => r.name).filter(Boolean),
);

const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pending = files.filter((f) => !applied.has(basename(f, ".sql")));

if (pending.length === 0) {
  console.log("OK: No pending migrations");
  process.exit(0);
}

console.log(`Pending: ${pending.length} file(s)`);
for (const file of pending) {
  const name = basename(file, ".sql");
  const query = readFileSync(join(migDir, file), "utf8");
  console.log(`  Applying ${name}...`);
  await apiPost("/database/migrations", { name, query });
  console.log(`  OK ${name}`);
}
console.log("Done");

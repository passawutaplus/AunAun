#!/usr/bin/env node
/**
 * One-time: update ecosystem default Supabase project ref in repo (not secrets).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OLD = "rvnzjiskqliexysicfmh";
const NEW = "zkflkpbmbozrchqncpzi";
const OLD_URL = `https://${OLD}.supabase.co`;
const NEW_URL = `https://${NEW}.supabase.co`;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const THIS_FILE = fileURLToPath(import.meta.url);

const SKIP_DIRS = new Set(["node_modules", ".git", ".vite-cache", "dist", "backups"]);

const SKIP_FILES = [
  "migrate-singapore.mjs",
  "copy-database-via-api.mjs",
  "clone-db-cli.mjs",
  "update-project-ref.mjs",
  "_check-env.sh",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function shouldTouch(file) {
  if (file === THIS_FILE) return false;
  if (SKIP_FILES.some((s) => file.endsWith(s))) return false;
  if (file.includes(`${join("supabase", "migrations")}`)) return false;
  if (file.endsWith(".dump")) return false;
  if (file.endsWith(".json") && file.includes("inventory")) return false;
  const base = file.split(/[/\\]/).pop() ?? "";
  if (base === ".env") return false;
  const ext = base.includes(".") ? base.split(".").pop() : "";
  return ["ts", "tsx", "js", "mjs", "sh", "ps1", "md", "toml", "yml", "yaml", "example", "sql"].includes(ext ?? "");
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (!shouldTouch(file)) continue;
  let text = readFileSync(file, "utf8");
  if (!text.includes(OLD) && !text.includes(OLD_URL)) continue;
  const next = text.replaceAll(OLD_URL, NEW_URL).replaceAll(OLD, NEW);
  if (next !== text) {
    writeFileSync(file, next, "utf8");
    changed += 1;
    console.log("updated", file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
  }
}
console.log(`Done: ${changed} file(s)`);

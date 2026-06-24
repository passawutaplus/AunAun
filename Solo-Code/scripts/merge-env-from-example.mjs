#!/usr/bin/env node
/**
 * Merge missing keys from .env.example into .env (never overwrites existing values).
 * Also pulls VITE_PAYMENTS_CLIENT_TOKEN from .env.development when present.
 *
 * Usage: node scripts/merge-env-from-example.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");
const devPath = resolve(root, ".env.development");

function parseEnv(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function serializeEnv(existingText, merged) {
  const existingKeys = new Set();
  const out = [];
  for (const line of existingText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
      existingKeys.add(key);
      if (merged.has(key)) {
        const value = merged.get(key);
        out.push(formatLine(key, value));
        merged.delete(key);
      } else {
        out.push(line);
      }
    } else {
      out.push(line);
    }
  }
  if (merged.size > 0) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push("# --- added by scripts/merge-env-from-example.mjs ---");
    for (const [key, value] of merged) {
      if (!existingKeys.has(key)) out.push(formatLine(key, value));
    }
  }
  return out.join("\n").replace(/\n?$/, "\n");
}

function formatLine(key, value) {
  if (value === "") return `${key}=`;
  if (/[\s#]/.test(value)) return `${key}="${value}"`;
  return `${key}=${value}`;
}

if (!existsSync(envPath)) {
  console.error("No .env found. Copy .env.example to .env first.");
  process.exit(1);
}

const example = parseEnv(readFileSync(examplePath, "utf8"));
const current = parseEnv(readFileSync(envPath, "utf8"));
const dev = existsSync(devPath) ? parseEnv(readFileSync(devPath, "utf8")) : new Map();

const toAdd = new Map();
for (const [key, value] of example) {
  if (current.has(key)) continue;
  if (key === "VITE_PAYMENTS_CLIENT_TOKEN" && dev.has(key)) {
    toAdd.set(key, dev.get(key));
  } else if (value && !value.startsWith("your_")) {
    toAdd.set(key, value);
  } else {
    toAdd.set(key, "");
  }
}

if (toAdd.size === 0) {
  console.log(".env already has all keys from .env.example");
  process.exit(0);
}

const backupPath = `${envPath}.backup`;
writeFileSync(backupPath, readFileSync(envPath, "utf8"));
const merged = new Map([...current, ...toAdd]);
writeFileSync(envPath, serializeEnv(readFileSync(envPath, "utf8"), merged));

console.log(`Backed up .env → .env.backup`);
console.log(`Added ${toAdd.size} key(s): ${[...toAdd.keys()].join(", ")}`);

const oldRef = "jdqrrzaleapablabphmw";
const newRef = "rvnzjiskqliexysicfmh";
const usesOld = [...merged.entries()].some(([, v]) => typeof v === "string" && v.includes(oldRef));
if (usesOld) {
  console.log("");
  console.log(`⚠️  .env still points to closed project ${oldRef}.`);
  console.log(`   Copy Supabase keys from your other machine or Dashboard → project ${newRef}`);
}

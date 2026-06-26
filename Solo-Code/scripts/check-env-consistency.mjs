#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const solo = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(join(solo, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

function jwtRef(key) {
  try {
    const p = key.split(".")[1];
    return JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()).ref;
  } catch {
    return null;
  }
}

const urlRef = env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const keys = [
  ["VITE_SUPABASE_PUBLISHABLE_KEY", env.VITE_SUPABASE_PUBLISHABLE_KEY],
  ["SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_PUBLISHABLE_KEY],
  ["SUPABASE_ANON_KEY", env.SUPABASE_ANON_KEY],
];

console.log("URL ref:", urlRef);
console.log("VITE_SUPABASE_PROJECT_ID:", env.VITE_SUPABASE_PROJECT_ID);
for (const [name, key] of keys) {
  if (!key) continue;
  const ref = jwtRef(key);
  const kind = key.startsWith("sb_publishable_") ? "publishable" : key.startsWith("eyJ") ? "jwt" : "other";
  console.log(name, kind, "ref:", ref, ref === urlRef ? "OK" : "MISMATCH");
}

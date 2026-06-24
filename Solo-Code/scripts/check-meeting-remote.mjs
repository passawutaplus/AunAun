#!/usr/bin/env node
/** Check if meeting_captures schema exists on remote Supabase. */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = v;
  }
}

loadEnv(envPath);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const { error } = await sb.from("meeting_captures").select("id").limit(1);
if (error) {
  console.log("meeting_captures: MISSING", error.code, error.message);
  process.exit(1);
}
console.log("meeting_captures: EXISTS");

const { data: costs } = await sb
  .from("ai_feature_costs")
  .select("feature, label")
  .like("feature", "ai_meeting_%");
console.log("ai_meeting features:", costs?.length ?? 0);
for (const row of costs ?? []) console.log(`  ${row.feature}: ${row.label}`);

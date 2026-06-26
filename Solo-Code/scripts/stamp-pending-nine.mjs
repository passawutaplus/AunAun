#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = "zkflkpbmbozrchqncpzi";
const pending = [
  "20260609120000_admin_business_rls",
  "20260609160000_ai_credit_weights_v2",
  "20260609160000_fetch_daily_trends_cron",
  "20260613120000_anthem_portfolio_from_images",
  "20260614120000_community_moderation",
  "20260618120000_design_drill_reroll",
  "20260618120000_document_signatures",
  "20260618120000_meeting_captures",
  "20260619120000_feed_interests",
];

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

for (const name of pending) {
  const safe = name.replace(/'/g, "''");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${safe}', '${safe}') ON CONFLICT (version) DO NOTHING`,
    }),
  });
  console.log(name, res.status);
  await new Promise((r) => setTimeout(r, 200));
}

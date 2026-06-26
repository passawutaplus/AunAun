#!/usr/bin/env node
/** Apply 20260608120000_welcome_px_missions.sql on remote (unified anthem/shared schemas). */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { sanitizeBundleSql } from "./sql-transform.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const monoRoot = join(root, "..");
const envPaths = [
  join(monoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(root, ".env"),
];

for (const p of envPaths) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const SQL_PATH = join(root, "supabase/migrations/20260608120000_welcome_px_missions.sql");

const PREAMBLE = `
-- Prereqs for unified backend (shared wallets + anthem RPCs)
CREATE TABLE IF NOT EXISTS shared.gift_limits_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_limit_unverified int NOT NULL DEFAULT 500,
  daily_limit_verified int NOT NULL DEFAULT 5000,
  velocity_per_hour int NOT NULL DEFAULT 10,
  hold_hours int NOT NULL DEFAULT 24,
  min_account_age_hours int NOT NULL DEFAULT 1,
  max_topup_per_tx int NOT NULL DEFAULT 100000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shared.gift_limits_config(id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON shared.gift_limits_config TO authenticated, anon;
GRANT ALL ON shared.gift_limits_config TO service_role;
ALTER TABLE shared.gift_limits_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read limits config" ON shared.gift_limits_config;
CREATE POLICY "Public read limits config" ON shared.gift_limits_config FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION anthem.available_purchased_px(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
  SELECT COALESCE((SELECT purchased_px FROM shared.wallets WHERE user_id = _uid), 0);
$$;

CREATE OR REPLACE FUNCTION anthem.daily_gift_total(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
  SELECT COALESCE(SUM(price_px), 0)::int FROM shared.gift_transactions
  WHERE sender_id = _uid AND created_at >= date_trunc('day', now());
$$;

GRANT EXECUTE ON FUNCTION anthem.available_purchased_px(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anthem.daily_gift_total(uuid) TO authenticated;
`;

const ANTHEM_RPCS = [
  "available_purchased_px",
  "daily_gift_total",
  "available_gift_px",
  "mark_onboarding_visit",
  "claim_welcome_mission",
  "send_gift",
];

function transformWelcomeMissionsSql(sql) {
  let s = PREAMBLE + sanitizeBundleSql(sql);

  for (const fn of ANTHEM_RPCS) {
    s = s.replaceAll(`CREATE OR REPLACE FUNCTION public.${fn}`, `CREATE OR REPLACE FUNCTION anthem.${fn}`);
    s = s.replaceAll(`GRANT EXECUTE ON FUNCTION public.${fn}`, `GRANT EXECUTE ON FUNCTION anthem.${fn}`);
  }

  s = s.replaceAll("PERFORM public.ensure_wallet", "PERFORM anthem.ensure_wallet");
  s = s.replaceAll("public.available_purchased_px", "anthem.available_purchased_px");
  s = s.replaceAll("public.daily_gift_total", "anthem.daily_gift_total");
  s = s.replaceAll("public.available_gift_px", "anthem.available_gift_px");

  s = s.replace(
    "RETURNS gift_transactions LANGUAGE plpgsql",
    "RETURNS shared.gift_transactions LANGUAGE plpgsql",
  );
  s = s.replaceAll("g public.gifts", "g shared.gifts");
  s = s.replaceAll("tx public.gift_transactions", "tx shared.gift_transactions");
  s = s.replaceAll("w public.wallets%ROWTYPE", "w shared.wallets%ROWTYPE");

  return s;
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Need SUPABASE_ACCESS_TOKEN");
    process.exit(1);
  }

  const sql = transformWelcomeMissionsSql(readFileSync(SQL_PATH, "utf8"));
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("Apply failed:", res.status, body);
    process.exit(1);
  }
  console.log("✓ Applied welcome_px_missions migration");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

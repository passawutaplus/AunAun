#!/usr/bin/env node
/**
 * Verify all Stripe lookup_keys from stripe.ts exist (active prices).
 * Loads STRIPE_SANDBOX_API_KEY or STRIPE_LIVE_API_KEY from Solo-Code/.env
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (v) process.env[m[1]] = v;
  }
}

const key =
  process.env.STRIPE_SANDBOX_API_KEY ||
  process.env.STRIPE_LIVE_API_KEY ||
  process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error("Set STRIPE_SANDBOX_API_KEY or STRIPE_LIVE_API_KEY in Solo-Code/.env");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

const LOOKUP_KEYS = [
  "pro_monthly",
  "pro_yearly",
  "pro_plus_monthly",
  "pro_plus_yearly",
  "inhouse_monthly",
  "inhouse_yearly",
  "credits_100",
  "credits_500",
  "credits_2000",
  "px_500",
  "px_2000",
  "px_10000",
];

async function main() {
  const mode = key.startsWith("sk_test_") || key.startsWith("rk_test_") ? "test" : "live";
  console.log(`Verifying ${LOOKUP_KEYS.length} lookup keys (${mode} mode)…\n`);

  let ok = 0;
  for (const lookupKey of LOOKUP_KEYS) {
    const res = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const p = res.data[0];
    if (!p) {
      console.log(`✗ ${lookupKey}`);
      continue;
    }
    ok++;
    console.log(`✓ ${lookupKey} → ${p.id} (${p.unit_amount} ${p.currency})`);
  }

  console.log(`\n${ok}/${LOOKUP_KEYS.length} ready`);
  if (ok !== LOOKUP_KEYS.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

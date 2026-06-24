#!/usr/bin/env node
/**
 * Idempotent sync: Stripe Products + Prices with lookup_keys matching Solo-Code/src/lib/stripe.ts
 *
 * Usage (from Solo-Code/):
 *   node scripts/stripe/provision-sandbox.mjs
 *   STRIPE_SANDBOX_API_KEY=sk_test_... node scripts/stripe/provision-sandbox.mjs
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
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const key = process.env.STRIPE_SANDBOX_API_KEY;
if (!key) {
  console.error("Set STRIPE_SANDBOX_API_KEY in Solo-Code/.env");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

/** @type {Array<{ catalogKey: string; productName: string; productDescription?: string; prices: Array<{ lookup_key: string; unit_amount: number; currency: string; recurring?: { interval: string } }> }>} */
const CATALOG = [
  {
    catalogKey: "so1o_pro",
    productName: "So1o Pro",
    productDescription: "Pro subscription — So1o My Desk + an1hem",
    prices: [
      {
        lookup_key: "pro_monthly",
        unit_amount: 24900,
        currency: "thb",
        recurring: { interval: "month" },
      },
      {
        lookup_key: "pro_yearly",
        unit_amount: 238800,
        currency: "thb",
        recurring: { interval: "year" },
      },
    ],
  },
  {
    catalogKey: "so1o_pro_plus",
    productName: "So1o Pro+",
    productDescription: "Pro+ ecosystem subscription",
    prices: [
      {
        lookup_key: "pro_plus_monthly",
        unit_amount: 39900,
        currency: "thb",
        recurring: { interval: "month" },
      },
      {
        lookup_key: "pro_plus_yearly",
        unit_amount: 382800,
        currency: "thb",
        recurring: { interval: "year" },
      },
    ],
  },
  {
    catalogKey: "so1o_inhouse",
    productName: "So1o In-House",
    productDescription: "Team subscription (per seat)",
    prices: [
      {
        lookup_key: "inhouse_monthly",
        unit_amount: 59900,
        currency: "thb",
        recurring: { interval: "month" },
      },
      {
        lookup_key: "inhouse_yearly",
        unit_amount: 575000,
        currency: "thb",
        recurring: { interval: "year" },
      },
    ],
  },
  {
    catalogKey: "so1o_ai_credits",
    productName: "So1o AI Credits",
    productDescription: "One-time AI credit top-up",
    prices: [
      { lookup_key: "credits_100", unit_amount: 9900, currency: "thb" },
      { lookup_key: "credits_500", unit_amount: 39900, currency: "thb" },
      { lookup_key: "credits_2000", unit_amount: 129000, currency: "thb" },
    ],
  },
  {
    catalogKey: "an1hem_px",
    productName: "an1hem Pixel (PX)",
    productDescription: "Closed-loop Pixel top-up for gifting",
    prices: [
      { lookup_key: "px_500", unit_amount: 50000, currency: "thb" },
      { lookup_key: "px_2000", unit_amount: 200000, currency: "thb" },
      { lookup_key: "px_10000", unit_amount: 1000000, currency: "thb" },
    ],
  },
  {
    catalogKey: "an1hem_boost",
    productName: "an1hem Post Boost",
    productDescription: "Self-serve boost for portfolio or community posts",
    prices: [
      { lookup_key: "boost_99_3d", unit_amount: 9900, currency: "thb" },
      { lookup_key: "boost_249_7d", unit_amount: 24900, currency: "thb" },
      { lookup_key: "boost_499_14d", unit_amount: 49900, currency: "thb" },
    ],
  },
  {
    catalogKey: "an1hem_ads",
    productName: "an1hem Brand Ads",
    productDescription: "Sponsored brand/product campaigns (admin reviewed)",
    prices: [
      { lookup_key: "ad_basic", unit_amount: 99000, currency: "thb" },
      { lookup_key: "ad_standard", unit_amount: 249000, currency: "thb" },
      { lookup_key: "ad_premium", unit_amount: 590000, currency: "thb" },
    ],
  },
];

const ALL_LOOKUP_KEYS = CATALOG.flatMap((g) => g.prices.map((p) => p.lookup_key));

async function findProductByCatalogKey(catalogKey) {
  const found = await stripe.products.search({
    query: `metadata['catalog_key']:'${catalogKey}'`,
    limit: 1,
  });
  return found.data[0] ?? null;
}

async function ensureProduct(group) {
  let product = await findProductByCatalogKey(group.catalogKey);
  if (product) {
    if (product.name !== group.productName || product.description !== group.productDescription) {
      product = await stripe.products.update(product.id, {
        name: group.productName,
        description: group.productDescription,
      });
      console.log(`  ~ updated product ${product.id}`);
    } else {
      console.log(`  ✓ product ${product.id}`);
    }
    return product;
  }

  product = await stripe.products.create({
    name: group.productName,
    description: group.productDescription,
    metadata: { catalog_key: group.catalogKey },
  });
  console.log(`  + product ${product.id}`);
  return product;
}

function priceMatches(existing, def) {
  if (existing.currency !== def.currency) return false;
  if (existing.unit_amount !== def.unit_amount) return false;
  const wantRecurring = !!def.recurring;
  const hasRecurring = !!existing.recurring;
  if (wantRecurring !== hasRecurring) return false;
  if (wantRecurring && existing.recurring?.interval !== def.recurring.interval) return false;
  return true;
}

async function ensurePrice(productId, def) {
  const existing = await stripe.prices.list({
    lookup_keys: [def.lookup_key],
    active: true,
    limit: 1,
  });

  if (existing.data[0]) {
    const p = existing.data[0];
    if (p.product === productId && priceMatches(p, def)) {
      console.log(`  ✓ ${def.lookup_key} (${p.id}) ${p.unit_amount} ${p.currency}`);
      return p;
    }
    await stripe.prices.update(p.id, { lookup_key: `${def.lookup_key}_archived_${Date.now()}` });
    await stripe.prices.update(p.id, { active: false });
    console.log(`  ~ archived stale ${def.lookup_key} (${p.id})`);
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: def.currency,
    unit_amount: def.unit_amount,
    lookup_key: def.lookup_key,
    ...(def.recurring ? { recurring: def.recurring } : {}),
    metadata: { lovable_external_id: def.lookup_key },
  });
  console.log(`  + ${def.lookup_key} (${created.id}) ${created.unit_amount} ${created.currency}`);
  return created;
}

async function verifyCatalog() {
  console.log("\nVerification:");
  let missing = 0;
  for (const lookupKey of ALL_LOOKUP_KEYS) {
    const res = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (!res.data[0]) {
      console.log(`  ✗ missing ${lookupKey}`);
      missing++;
    } else {
      console.log(`  ✓ ${lookupKey} → ${res.data[0].id}`);
    }
  }
  if (missing > 0) {
    throw new Error(`${missing} lookup key(s) still missing after sync`);
  }
}

async function main() {
  const account = await stripe.accounts.retrieve();
  console.log(`Stripe sync (test mode: ${!account.livemode})`);
  console.log(`Account: ${account.id}\n`);

  for (const group of CATALOG) {
    console.log(group.productName);
    const product = await ensureProduct(group);
    for (const priceDef of group.prices) {
      await ensurePrice(product.id, priceDef);
    }
    console.log("");
  }

  await verifyCatalog();

  const catalog = {
    synced_at: new Date().toISOString().slice(0, 10),
    mode: account.livemode ? "live" : "sandbox",
    stripe_account: account.id,
    products: {},
  };
  for (const group of CATALOG) {
    catalog.products[group.catalogKey] = { name: group.productName, prices: {} };
    for (const def of group.prices) {
      const res = await stripe.prices.list({
        lookup_keys: [def.lookup_key],
        active: true,
        limit: 1,
      });
      if (res.data[0]) catalog.products[group.catalogKey].prices[def.lookup_key] = res.data[0].id;
    }
  }
  const catalogName = account.livemode ? "catalog.live.json" : "catalog.sandbox.json";
  const { writeFileSync } = await import("fs");
  writeFileSync(
    join(dirname(fileURLToPath(import.meta.url)), catalogName),
    `${JSON.stringify(catalog, null, 2)}\n`,
  );
  console.log(`Wrote scripts/stripe/${catalogName}`);

  console.log("Done. Webhook endpoint:");
  console.log("  https://<your-so1o-host>/api/public/payments/webhook?env=sandbox");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

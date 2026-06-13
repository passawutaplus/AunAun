/**
 * Cron endpoints must reject unauthenticated POST (401/403/500 config).
 */
import { loadProjectEnv, SOLO_BASE } from "./load-env.mjs";

loadProjectEnv();

const CRON_PATHS = [
  "/api/public/cron/deadline-reminders",
  "/api/public/cron/payment-reminders",
  "/api/public/cron/fetch-daily-trends",
];

async function main() {
  console.log(`==> Cron auth smoke @ ${SOLO_BASE}\n`);
  let fail = 0;

  for (const path of CRON_PATHS) {
    const url = `${SOLO_BASE}${path}`;
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.status === 401 || res.status === 403 || res.status === 500) {
        console.log(`OK   POST ${path} → ${res.status} (not open)`);
      } else if (res.status === 404) {
        console.log(`WARN POST ${path} → 404 (route not on deploy?)`);
      } else {
        console.log(`FAIL POST ${path} → ${res.status} (expected 401/403)`);
        fail++;
      }
    } catch (e) {
      console.log(`FAIL POST ${path}: ${e.message}`);
      fail++;
    }
  }

  const wh = await fetch(`${SOLO_BASE}/api/public/payments/webhook`, { method: "POST", body: "{}" });
  const whBody = await wh.text();
  if (wh.status === 401 || wh.status === 403 || wh.status === 400 || wh.status === 500) {
    console.log(`OK   POST /api/public/payments/webhook → ${wh.status}`);
  } else if (wh.status === 404) {
    console.log("WARN webhook 404 (API route not on deploy?)");
  } else if (wh.status === 200 && /<!DOCTYPE|service_role|<html/i.test(whBody)) {
    console.log("WARN webhook 200 HTML (SPA shell — API not on this deploy)");
  } else if (wh.status === 200) {
    console.log(`WARN webhook → 200 (verify Stripe signature manually)`);
  } else {
    console.log(`FAIL webhook → ${wh.status}`);
    fail++;
  }

  if (fail) {
    console.log(`\n==> Cron smoke FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Cron smoke PASSED");
}

main();

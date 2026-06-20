#!/usr/bin/env node
/**
 * Security headers smoke — HSTS + baseline headers on production URLs.
 */
import { ANTHEM_BASE, loadProjectEnv, SOLO_BASE } from "./load-env.mjs";

loadProjectEnv();

const CHECKS = [
  { name: "Strict-Transport-Security", required: true },
  { name: "X-Content-Type-Options", required: true },
  { name: "Referrer-Policy", required: false },
];

async function checkHeaders(base, label) {
  let fail = 0;
  const url = `${base}/`;
  const res = await fetch(url, { redirect: "follow" });
  if (res.status >= 400) {
    console.log(`FAIL ${label} ${url} status ${res.status}`);
    return 1;
  }

  for (const check of CHECKS) {
    const value = res.headers.get(check.name);
    if (check.required && !value) {
      console.log(`FAIL ${label} missing ${check.name}`);
      fail++;
    } else if (value) {
      console.log(`OK   ${label} ${check.name}`);
    } else {
      console.log(`WARN ${label} missing ${check.name} (optional)`);
    }
  }
  return fail;
}

async function main() {
  console.log("==> Security headers smoke\n");
  let fail = 0;
  fail += await checkHeaders(SOLO_BASE, "Solo");
  fail += await checkHeaders(ANTHEM_BASE, "Anthem");

  if (fail) {
    console.log(`\n==> Security headers smoke FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Security headers smoke PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

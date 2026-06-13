/**
 * Invalid / missing share tokens — page should not crash or leak secrets.
 */
import { ANTHEM_BASE, loadProjectEnv, SOLO_BASE } from "./load-env.mjs";

loadProjectEnv();

const SOLO_TOKENS = [
  "/track/invalid-token-qa-000",
  "/brief/invalid-token-qa-000",
  "/supplier/invalid-token-qa-000",
];

const ANTHEM_TOKENS = [
  "/project/00000000-0000-0000-0000-000000000000",
];

async function check(base, path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  if (res.status >= 500) {
    console.log(`FAIL ${path} status ${res.status}`);
    return 1;
  }
  if (/service_role/i.test(text)) {
    console.log(`FAIL ${path} leaks service_role`);
    return 1;
  }
  console.log(`OK   ${path} (${res.status})`);
  return 0;
}

async function main() {
  console.log("==> Invalid token smoke\n");
  let fail = 0;
  console.log("--- Solo ---");
  for (const p of SOLO_TOKENS) fail += await check(SOLO_BASE, p);
  console.log("\n--- Anthem ---");
  for (const p of ANTHEM_TOKENS) fail += await check(ANTHEM_BASE, p);

  if (fail) {
    console.log(`\n==> Invalid token smoke FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Invalid token smoke PASSED");
}

main();

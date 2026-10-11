#!/usr/bin/env node
/**
 * One-time login helper. Opens a VISIBLE Edge window on the app; a person signs in (or signs up) with a TEST account,
 * then presses Enter in this terminal. The session is saved to .auth/<role>.json for the capture bot.
 *
 *   node scripts/payso-capture/login.mjs seller      # a creator test account
 *   node scripts/payso-capture/login.mjs buyer       # a client test account
 *   node scripts/payso-capture/login.mjs admin       # your admin account (only needed for the admin KYC screenshot)
 *
 * The bot never sees or types the password. Use e-mail + password sign-up for test accounts (Google sign-in is often
 * refused inside automated browsers). Delete .auth/*.json when you are done.
 */
import readline from "node:readline/promises";
import fs from "node:fs";
import { AUTH_DIR, BASE, ensureServer, openContext, statePath } from "./lib.mjs";

const role = process.argv[2];
if (!role || !/^[a-z0-9_-]+$/i.test(role)) {
  console.error("Usage: node scripts/payso-capture/login.mjs <seller|buyer|admin>");
  process.exit(2);
}

const stopServer = await ensureServer();
const { browser, context } = await openContext({ headless: false });
const page = await context.newPage();
await page.goto(`${BASE}/auth`);

console.log(`\nA window opened at ${BASE}/auth`);
console.log(`Sign in or sign up as the "${role}" TEST account in that window (confirm the e-mail if asked).`);
if (process.argv.includes("--auto")) {
  // Wait until the app has stored a Supabase session (up to 15 min), then save it.
  console.log("Waiting for the sign-in to finish …");
  await page.waitForFunction(
    () => Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k)),
    null,
    { timeout: 15 * 60 * 1000, polling: 1000 },
  );
  await page.waitForTimeout(2000);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Press Enter here when you are signed in > ");
  rl.close();
}

fs.mkdirSync(AUTH_DIR, { recursive: true });
await context.storageState({ path: statePath(role) });
console.log(`Saved session -> scripts/payso-capture/.auth/${role}.json`);
await browser.close();
stopServer();

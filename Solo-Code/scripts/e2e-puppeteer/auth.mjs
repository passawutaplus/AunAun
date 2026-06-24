import assert from "node:assert/strict";
import { baseURL } from "./config.mjs";
import { goto, launchBrowser, signIn, signOut, waitForServer, waitForUrl } from "./helpers.mjs";

function hasCredentials() {
  return Boolean(
    process.env.E2E_USER_EMAIL &&
    process.env.E2E_USER_PASSWORD &&
    process.env.E2E_ADMIN_EMAIL &&
    process.env.E2E_ADMIN_PASSWORD,
  );
}

export async function runAuth() {
  if (!hasCredentials()) {
    console.log("SKIP auth suite — set E2E_USER_* and E2E_ADMIN_* in .env.local");
    return;
  }

  if (baseURL.includes("localhost")) await waitForServer();

  const browser = await launchBrowser();
  const page = await browser.newPage();
  const failures = [];

  try {
    try {
      await signIn(page, "user");
      assert.match(page.url(), /\/(dashboard|apply)/);
      console.log("OK   user sign-in");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL user sign-in: ${err.message}`);
    }

    try {
      await signOut(page);
      assert.match(page.url(), /\/auth/);
      console.log("OK   user sign-out");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL user sign-out: ${err.message}`);
    }

    try {
      await signIn(page, "admin");
      await goto(page, "/admin");
      await waitForUrl(page, /\/admin/, 10_000);
      console.log("OK   admin can reach /admin");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL admin /admin: ${err.message}`);
    }

    try {
      await signIn(page, "user");
      await goto(page, "/admin");
      await waitForUrl(page, /\/dashboard/, 12_000);
      console.log("OK   non-admin blocked from /admin");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL non-admin /admin guard: ${err.message}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    throw new Error(`${failures.length} auth failure(s)`);
  }
}

import assert from "node:assert/strict";
import { baseURL } from "./config.mjs";
import { goto, launchBrowser, signIn, waitForServer, waitForUrl } from "./helpers.mjs";

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
      await goto(page, "/portfolio/manage");
      await waitForUrl(page, /portfolio\/manage/, 10_000);
      console.log("OK   user → /portfolio/manage");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL user portfolio: ${err.message}`);
    }

    try {
      await signIn(page, "admin");
      await goto(page, "/admin");
      await waitForUrl(page, /\/admin/, 10_000);
      console.log("OK   admin → /admin");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL admin: ${err.message}`);
    }

    try {
      await signIn(page, "user");
      await goto(page, "/admin");
      await waitForUrl(page, /^(?!.*\/admin).*$/, 12_000);
      assert.ok(!page.url().includes("/admin"));
      console.log("OK   user blocked from /admin");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL user /admin guard: ${err.message}`);
    }

    try {
      await signIn(page, "user");
      await goto(page, "/portfolio/new");
      await page.waitForSelector("input, textarea, [contenteditable='true']", { timeout: 12_000 });
      console.log("OK   user → project editor");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL project editor: ${err.message}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) throw new Error(`${failures.length} auth failure(s)`);
}

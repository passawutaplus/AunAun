import assert from "node:assert/strict";
import { baseURL } from "./config.mjs";
import { goto, launchBrowser, waitForServer, waitForUrl } from "./helpers.mjs";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/blog",
  "/terms",
  "/privacy",
  "/cookies",
  "/auth",
  "/auth/forgot",
  "/apply",
  "/help",
  "/help/getting-started",
];

export async function runSmoke() {
  if (baseURL.includes("localhost")) await waitForServer();

  const browser = await launchBrowser();
  const page = await browser.newPage();
  const failures = [];

  try {
    for (const path of PUBLIC_PATHS) {
      const name = `public ${path}`;
      try {
        const res = await goto(page, path);
        assert.ok(res && res.status() < 400, `${path} status ${res?.status()}`);
        const html = await page.content();
        assert.ok(!html.includes("service_role"), `${path} leaks service_role`);
        const headers = res.headers();
        assert.equal(
          headers["x-content-type-options"],
          "nosniff",
          `${path} X-Content-Type-Options`,
        );
        console.log(`OK   ${name}`);
      } catch (err) {
        failures.push({ name, err });
        console.log(`FAIL ${name}: ${err.message}`);
      }
    }

    try {
      await goto(page, "/dashboard");
      await waitForUrl(page, /\/auth/, 12_000);
      assert.match(page.url(), /\/auth/);
      console.log("OK   guest /dashboard → /auth");
    } catch (err) {
      failures.push({ name: "guest dashboard redirect", err });
      console.log(`FAIL guest /dashboard → /auth: ${err.message}`);
    }

    try {
      await goto(page, "/admin");
      await waitForUrl(page, /\/(auth|dashboard)/, 12_000);
      console.log(`OK   guest /admin redirect (${page.url()})`);
    } catch (err) {
      failures.push({ name: "guest admin redirect", err });
      console.log(`FAIL guest /admin redirect: ${err.message}`);
    }

    try {
      await goto(page, "/auth?redirect=//evil.com");
      assert.ok(!page.url().includes("evil.com"), "open redirect to evil.com");
      console.log("OK   open-redirect guard");
    } catch (err) {
      failures.push({ name: "open-redirect guard", err });
      console.log(`FAIL open-redirect guard: ${err.message}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    throw new Error(`${failures.length} smoke failure(s)`);
  }
}

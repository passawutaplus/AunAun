import assert from "node:assert/strict";
import { baseURL } from "./config.mjs";
import { goto, launchBrowser, seedCookieConsent, waitForServer, waitForUrl } from "./helpers.mjs";

export async function runSmoke() {
  if (baseURL.includes("localhost")) await waitForServer();

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await seedCookieConsent(page);
  const failures = [];

  try {
    try {
      const res = await goto(page, "/");
      assert.ok(res && res.status() < 400);
      await page.waitForSelector("main, [role=main]", { timeout: 10_000 });
      const title = await page.title();
      assert.match(title, /1px/i);
      console.log("OK   home renders + title");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL home: ${err.message}`);
    }

    try {
      await goto(page, "/auth");
      const hasLogin = await page.evaluate(() => {
        return [...document.querySelectorAll("button")].some((b) =>
          /เข้าสู่ระบบ|sign in|login/i.test(b.textContent ?? ""),
        );
      });
      assert.ok(hasLogin);
      console.log("OK   /auth reachable");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL /auth: ${err.message}`);
    }

    for (const path of ["/admin", "/chat"]) {
      try {
        await goto(page, path);
        await waitForUrl(page, /\/auth/, 12_000);
        console.log(`OK   guest ${path} → /auth`);
      } catch (err) {
        failures.push(err);
        console.log(`FAIL guest ${path}: ${err.message}`);
      }
    }

    try {
      await goto(page, "/auth?redirect=//evil.com");
      assert.ok(!page.url().includes("evil.com"));
      console.log("OK   open-redirect guard");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL open-redirect: ${err.message}`);
    }

    for (const path of [
      "/legal/terms",
      "/legal/privacy",
      "/legal/cookies",
      "/legal/rights",
      "/legal/ip",
      "/jobs",
      "/advertise",
      "/research",
      "/upgrade",
      "/error/404",
    ]) {
      try {
        await goto(page, path);
        const text = await page.evaluate(() => document.body?.innerText ?? "");
        assert.ok(text.length > 0);
        console.log(`OK   ${path}`);
      } catch (err) {
        failures.push(err);
        console.log(`FAIL ${path}: ${err.message}`);
      }
    }

    try {
      await goto(page, "/");
      const csp = await page.$$('meta[http-equiv="Content-Security-Policy-Report-Only"]');
      const nosniff = await page.$$('meta[http-equiv="X-Content-Type-Options"]');
      assert.ok(csp.length > 0 && nosniff.length > 0);
      console.log("OK   security meta headers");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL security meta: ${err.message}`);
    }

    try {
      const res = await goto(page, "/");
      const body = await res.text();
      assert.ok(!/service_role/i.test(body));
      console.log("OK   no service_role leak");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL service_role: ${err.message}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) throw new Error(`${failures.length} smoke failure(s)`);
}

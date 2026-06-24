import assert from "node:assert/strict";
import { baseURL } from "./config.mjs";
import { goto, launchBrowser, signInDemo, waitForServer, waitForUrl } from "./helpers.mjs";

const DEMO_CONV_ID = "00000000-0000-0000-000c-000000000005";

export async function runChat() {
  if (baseURL.includes("localhost")) await waitForServer();

  const browser = await launchBrowser();
  const page = await browser.newPage();
  const failures = [];

  try {
    try {
      await signInDemo(page);
      await goto(page, "/chat");
      await page.waitForFunction(
        () => document.body?.innerText?.includes("ข้อความ"),
        { timeout: 15_000 },
      );
      await page.waitForSelector("aside ul li button", { timeout: 15_000 });
      console.log("OK   chat inbox lists conversations");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL chat inbox: ${err.message}`);
    }

    try {
      await signInDemo(page);
      await page.setViewport({ width: 1280, height: 800 });
      await goto(page, `/chat/${DEMO_CONV_ID}`);
      await page.waitForSelector("textarea, input[type='text']", { timeout: 15_000 });
      const body = await page.evaluate(() => document.body?.innerText ?? "");
      assert.ok(!body.includes("โหลดแชทไม่สำเร็จ"));
      console.log("OK   direct chat thread URL");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL chat thread: ${err.message}`);
    }

    try {
      await signInDemo(page);
      await goto(page, "/chat");
      const hasHome = await page.evaluate(() =>
        [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("กลับหน้าแรก")),
      );
      assert.ok(hasHome);
      console.log("OK   chat sidebar home button");
    } catch (err) {
      failures.push(err);
      console.log(`FAIL chat sidebar: ${err.message}`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) throw new Error(`${failures.length} chat failure(s)`);
}

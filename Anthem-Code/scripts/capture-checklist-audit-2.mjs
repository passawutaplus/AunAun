/**
 * Authed + remaining local captures for checklist audit.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../../.tmp-checklist-audit");
mkdirSync(OUT, { recursive: true });

const LOCAL = "http://127.0.0.1:8080";
const DEMO = "https://aplus1-demo.vercel.app";
const EMAIL = "phatsawut@demo.pixel100.com";
const PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "pixel100-demo-seed";

const CONSENT = {
  version: 1,
  decidedAt: "2026-01-01T00:00:00.000Z",
  essential: true,
  functional: true,
  analytics: true,
};

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  console.log("ok", name);
}

async function seed(ctx) {
  await ctx.addInitScript((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, CONSENT);
}

async function dismiss(page) {
  const skip = page.getByRole("button", { name: /ข้ามและเริ่มใช้งาน|ข้ามไปก่อน/ });
  if (await skip.count()) {
    await skip.last().click({ force: true, timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function settle(page) {
  await page.waitForTimeout(700);
  await dismiss(page);
  try {
    await page.waitForLoadState("networkidle", { timeout: 8000 });
  } catch { /* ignore */ }
  await page.waitForTimeout(300);
}

const browser = await chromium.launch({ headless: true });

// Local extras: real 404 route, hover, search, skip-link
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await seed(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(`${LOCAL}/`, { waitUntil: "domcontentloaded" });
  await settle(page);

  await page.goto(`${LOCAL}/error/404`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await shot(page, "desktop-22-http-404");

  await page.goto(`${LOCAL}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const card = page.locator("img").nth(4);
  if (await card.count()) {
    await card.hover({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, "desktop-09-feed-card-hover");
  }
  const search = page.getByPlaceholder(/ค้นหา|Find|inspiration/i).first();
  if (await search.count()) {
    await search.click({ force: true });
    await page.waitForTimeout(400);
    await shot(page, "desktop-10-search-focus-empty");
    await search.fill("zzzznoresultsxyz");
    await page.keyboard.press("Enter");
    await settle(page);
    await shot(page, "desktop-11-search-no-results");
  } else {
    await shot(page, "desktop-10-search-missing");
  }

  await page.goto(`${LOCAL}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  await shot(page, "desktop-07b-skip-after-dismiss");

  await ctx.close();
}

// Mobile extras: bottom nav, 404 http, login error
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await seed(ctx);
  const page = await ctx.newPage();
  await page.goto(`${LOCAL}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await shot(page, "mobile-01b-feed-after-skip");
  await page.goto(`${LOCAL}/error/404`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await shot(page, "mobile-22-http-404");
  await ctx.close();
}

// Demo authed
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await seed(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(`${DEMO}/auth`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await shot(page, "demo-02-login");
  const demoBtn = page.getByRole("button", { name: /ฟรีแลนซ์ทั่วไป/ });
  if (await demoBtn.count()) {
    await demoBtn.first().click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.getByLabel(/อีเมล/).first().fill(EMAIL);
  await page.getByLabel(/รหัสผ่าน/).first().fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click({ force: true });
  try {
    await page.waitForURL((u) => !u.pathname.includes("/auth"), { timeout: 20000 });
    await settle(page);
    await shot(page, "demo-08-feed-authed");

    const search = page.getByPlaceholder(/ค้นหา/).first();
    if (await search.count()) {
      await search.click({ force: true });
      await page.waitForTimeout(400);
      await shot(page, "demo-10-search-focus");
      await search.fill("zzzznoresultsxyz");
      await page.keyboard.press("Enter");
      await settle(page);
      await shot(page, "demo-11-search-no-results");
    }

    await page.goto(`${DEMO}/notifications`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-14-notifications");

    await page.goto(`${DEMO}/chat`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-15-chat");

    await page.goto(`${DEMO}/settings`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-16-settings");

    await page.goto(`${DEMO}/portfolio`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-19-portfolio");

    await page.goto(`${DEMO}/`, { waitUntil: "domcontentloaded" });
    await settle(page);
    const p = page.locator('a[href^="/u/"], a[href^="/@"]').first();
    if (await p.count()) {
      await p.click({ force: true });
      await settle(page);
      await shot(page, "demo-20-public-profile");
    }
    await page.goto(`${DEMO}/`, { waitUntil: "domcontentloaded" });
    await settle(page);
    const proj = page.locator('a[href*="/p/"], a[href*="/project/"]').first();
    if (await proj.count()) {
      await proj.click({ force: true });
      await settle(page);
      await shot(page, "demo-21-project-detail");
    }
  } catch (err) {
    await shot(page, "demo-08-login-failed");
    console.log("demo login failed", err.message);
  }
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await seed(ctx);
  const page = await ctx.newPage();
  await page.goto(`${DEMO}/auth`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.getByLabel(/อีเมล/).first().fill(EMAIL);
  await page.getByLabel(/รหัสผ่าน/).first().fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click({ force: true });
  try {
    await page.waitForURL((u) => !u.pathname.includes("/auth"), { timeout: 20000 });
    await settle(page);
    await shot(page, "demo-mobile-08-feed");
    await page.goto(`${DEMO}/notifications`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-mobile-14-notifications");
    await page.goto(`${DEMO}/chat`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "demo-mobile-15-chat");
  } catch (err) {
    await shot(page, "demo-mobile-08-login-failed");
    console.log("demo mobile login failed", err.message);
  }
  await ctx.close();
}

await browser.close();
console.log("done");

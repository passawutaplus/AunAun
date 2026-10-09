/**
 * One-off Checklist Design audit captures.
 * Writes PNGs to ../.tmp-checklist-audit/
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../../.tmp-checklist-audit");
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8080";
const EMAIL = process.env.E2E_DEMO_EMAIL ?? "phatsawut@demo.pixel100.com";
const PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "pixel100-demo-seed";

mkdirSync(OUT, { recursive: true });

const CONSENT = {
  version: 1,
  decidedAt: "2026-01-01T00:00:00.000Z",
  essential: true,
  functional: true,
  analytics: true,
};

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log("ok", name);
  return path;
}

async function waitSettled(page) {
  await page.waitForTimeout(600);
  try {
    await page.waitForLoadState("networkidle", { timeout: 6_000 });
  } catch {
    /* feed may keep polling */
  }
  await dismissOverlays(page);
  await page.waitForTimeout(300);
}

async function step(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.log("skip", name, String(err.message || err).split("\n")[0]);
  }
}

async function dismissOverlays(page) {
  const skip = page.getByRole("button", { name: /ข้ามและเริ่มใช้งาน|ข้ามไปก่อน/ });
  if (await skip.count()) {
    await skip.last().click({ force: true, timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function seedConsent(context) {
  await context.addInitScript((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, CONSENT);
}

async function captureViewport(browser, tag, size) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: size.width < 500 ? 2 : 1,
    locale: "th-TH",
  });
  await seedConsent(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  // --- guest: capture onboarding first, then skip so other pages are visible ---
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shot(page, `${tag}-00b-onboarding-survey`);
  await dismissOverlays(page);
  await waitSettled(page);
  await shot(page, `${tag}-01-feed-guest`);

  // cookie banner (fresh context without consent)
  const rawCtx = await browser.newContext({ viewport: size, deviceScaleFactor: size.width < 500 ? 2 : 1 });
  const raw = await rawCtx.newPage();
  await raw.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await raw.waitForTimeout(1200);
  await shot(raw, `${tag}-00-cookie-banner`);
  await rawCtx.close();

  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await dismissOverlays(page);
  await shot(page, `${tag}-02-login`);

  const signupTab = page.getByRole("tab", { name: /สมัครสมาชิก/ });
  if (await signupTab.count()) {
    await signupTab.click({ force: true });
    await waitSettled(page);
    await shot(page, `${tag}-03-signup`);
  }

  await page.getByRole("tab", { name: /เข้าสู่ระบบ/ }).click({ force: true });
  await page.getByLabel(/อีเมล/).first().fill("wrong@example.com");
  await page.getByLabel(/รหัสผ่าน/).first().fill("bad-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click({ force: true });
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-04-login-error`);

  await page.goto(`${BASE}/auth/forgot`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-05-forgot`);

  await page.goto(`${BASE}/this-page-does-not-exist-audit`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-06-404`);

  // skip link: tab from body
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await shot(page, `${tag}-07-skip-link-focus`);

  // --- login ---
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await dismissOverlays(page);
  await page.getByRole("tab", { name: /เข้าสู่ระบบ/ }).click({ force: true });
  await page.getByLabel(/อีเมล/).first().fill(EMAIL);
  await page.getByLabel(/รหัสผ่าน/).first().fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click({ force: true });
  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15_000 });
  } catch {
    await shot(page, `${tag}-08-login-failed`);
    // Fallback: demo host has seeded accounts
    await context.close();
    return { loggedIn: false };
  }
  await waitSettled(page);
  await shot(page, `${tag}-08-feed-authed`);

  // hover first project card if present
  const card = page.locator("article, a[href*='/p/'], a[href*='/project']").first();
  if (await card.count()) {
    await card.hover({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, `${tag}-09-feed-card-hover`);
  }

  // search empty + recent
  const search = page.getByPlaceholder(/ค้นหา/).first();
  if (await search.count()) {
    await search.click({ force: true });
    await page.waitForTimeout(400);
    await shot(page, `${tag}-10-search-focus-empty`);
    await search.fill("zzzznoresultsxyz");
    await page.keyboard.press("Enter");
    await waitSettled(page);
    await shot(page, `${tag}-11-search-no-results`);
  }

  await page.goto(`${BASE}/?mode=community`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-12-community`);

  await page.goto(`${BASE}/jobs`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-13-jobs`);

  await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-14-notifications`);

  await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-15-chat`);

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-16-settings`);

  const notifNav = page.getByRole("link", { name: /แจ้งเตือน/ }).first();
  if (await notifNav.count()) {
    await notifNav.click({ force: true });
    await waitSettled(page);
    await shot(page, `${tag}-17-settings-notifications`);
  }

  const privacyNav = page.getByRole("link", { name: /ความเป็นส่วนตัว|privacy/i }).first();
  if (await privacyNav.count()) {
    await privacyNav.click({ force: true });
    await waitSettled(page);
    await shot(page, `${tag}-18-settings-privacy`);
  }

  await page.goto(`${BASE}/portfolio`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  await shot(page, `${tag}-19-portfolio`);

  // public profile: click owner on feed
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  const profileLink = page.locator('a[href^="/u/"], a[href^="/@"]').first();
  if (await profileLink.count()) {
    await profileLink.click({ force: true });
    await waitSettled(page);
    await shot(page, `${tag}-20-public-profile`);
  }

  // project detail
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitSettled(page);
  const project = page.locator('a[href*="/p/"], a[href*="/project/"]').first();
  if (await project.count()) {
    await project.click({ force: true });
    await waitSettled(page);
    await shot(page, `${tag}-21-project-detail`);
  }

  await context.close();
  return { loggedIn: true };
}

const browser = await chromium.launch({ headless: true });
try {
  try {
    await captureViewport(browser, "desktop", { width: 1440, height: 900 });
  } catch (err) {
    console.log("desktop failed", err.message);
  }
  try {
    await captureViewport(browser, "mobile", { width: 390, height: 844 });
  } catch (err) {
    console.log("mobile failed", err.message);
  }
} finally {
  await browser.close();
}
console.log("done", OUT);

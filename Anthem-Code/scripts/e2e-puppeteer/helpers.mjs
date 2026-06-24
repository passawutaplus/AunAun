import puppeteer from "puppeteer-core";
import { baseURL, cookieConsentState, resolveChromePath } from "./config.mjs";

export async function launchBrowser() {
  const executablePath = resolveChromePath();
  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium found. Run: bash scripts/e2e-puppeteer/install-chrome-deps.sh\n" +
        "Or set PUPPETEER_EXECUTABLE_PATH. Fallback: npm run smoke:public",
    );
  }
  try {
    return await puppeteer.launch({
      executablePath,
      headless: process.env.E2E_HEADED !== "1",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    const hint =
      err.message?.includes("shared libraries") || err.message?.includes("libnspr4")
        ? "\nHint: bash scripts/e2e-puppeteer/install-chrome-deps.sh (needs sudo)"
        : "";
    throw new Error(`${err.message}${hint}`);
  }
}

export async function waitForServer(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseURL, { redirect: "follow" });
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not reachable at ${baseURL} after ${timeoutMs}ms`);
}

export async function seedCookieConsent(page) {
  await page.evaluateOnNewDocument((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, cookieConsentState);
}

export async function goto(page, path) {
  return page.goto(`${baseURL}${path}`, { waitUntil: "networkidle2", timeout: 30_000 });
}

export async function waitForUrl(page, pattern, timeoutMs = 15_000, invert = false) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const matches = re.test(page.url());
    if (invert ? !matches : matches) return page.url();
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`URL wait failed (invert=${invert}) ${re} — got ${page.url()}`);
}

export async function signIn(page, role) {
  const { getAccount } = await import("./config.mjs");
  const { email, password } = getAccount(role);
  await seedCookieConsent(page);
  await goto(page, "/auth");
  await page.waitForSelector("input[type='email'], input[type='password']", { timeout: 10_000 });
  await page.click("input[type='email']", { clickCount: 3 });
  await page.type("input[type='email']", email, { delay: 10 });
  await page.click("input[type='password']", { clickCount: 3 });
  await page.type("input[type='password']", password, { delay: 10 });
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent ?? "", btn);
    if (/^เข้าสู่ระบบ$/i.test(text.trim()) || /sign in|log in/i.test(text)) {
      await btn.click();
      break;
    }
  }
  await waitForUrl(page, /\/auth/, 20_000, true);
}

export async function signInDemo(page) {
  const { getDemoAccount } = await import("./config.mjs");
  const { email, password } = getDemoAccount();
  await seedCookieConsent(page);
  await goto(page, "/auth");
  await page.waitForSelector("input[type='email']", { timeout: 10_000 });
  await page.click("input[type='email']", { clickCount: 3 });
  await page.type("input[type='email']", email, { delay: 10 });
  await page.click("input[type='password']", { clickCount: 3 });
  await page.type("input[type='password']", password, { delay: 10 });
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent ?? "", btn);
    if (text.trim() === "เข้าสู่ระบบ") {
      await btn.click();
      break;
    }
  }
  await waitForUrl(page, /\/auth/, 20_000, true);
}

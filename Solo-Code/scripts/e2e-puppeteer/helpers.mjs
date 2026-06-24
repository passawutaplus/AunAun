import puppeteer from "puppeteer-core";
import { baseURL, resolveChromePath } from "./config.mjs";

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

export async function goto(page, path) {
  return page.goto(`${baseURL}${path}`, { waitUntil: "networkidle2", timeout: 30_000 });
}

export async function waitForUrl(page, pattern, timeoutMs = 15_000) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (re.test(page.url())) return page.url();
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`URL did not match ${re} — got ${page.url()}`);
}

export async function signIn(page, role) {
  const { getAccount } = await import("./config.mjs");
  const { email, password } = getAccount(role);
  await goto(page, "/auth");
  await page.waitForSelector("#login-email, input[type='email']", { timeout: 10_000 });
  const emailSel = (await page.$("#login-email")) ? "#login-email" : "input[type='email']";
  const passSel = (await page.$("#login-pass")) ? "#login-pass" : "input[type='password']";
  await page.click(emailSel, { clickCount: 3 });
  await page.type(emailSel, email, { delay: 10 });
  await page.click(passSel, { clickCount: 3 });
  await page.type(passSel, password, { delay: 10 });
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent ?? "", btn);
    if (/เข้าสู่ระบบ|sign in|log in/i.test(text)) {
      await btn.click();
      break;
    }
  }
  await waitForUrl(page, /\/(dashboard|apply|admin)/, 20_000);
}

export async function signOut(page) {
  await goto(page, "/dashboard?tab=settings");
  await new Promise((r) => setTimeout(r, 2000));
  const clicked = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("button, a")];
    const el = nodes.find((n) => /ออกจากระบบ|sign out|log out/i.test(n.textContent ?? ""));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    throw new Error("Sign out button not found — open Settings tab first if needed");
  }
  await waitForUrl(page, /\/auth/, 15_000);
}

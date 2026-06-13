/**
 * Admin panel crawl — each section loads without fatal error (needs admin creds).
 */
import { launchBrowser } from "./chrome.mjs";
import {
  ANTHEM_BASE,
  hasE2EAdmin,
  loadProjectEnv,
  SOLO_BASE,
} from "./load-env.mjs";

loadProjectEnv();

const SOLO_SECTIONS = [
  "overview",
  "activity_feed",
  "users",
  "tickets",
  "chat",
  "early_access",
  "feature_usage",
  "activity",
  "device",
  "ai_usage",
  "business",
  "subscriptions",
  "payments",
  "announcements",
  "banners",
  "articles",
  "ai_center",
  "health",
  "usage",
  "supabase",
];

const ANTHEM_ADMIN = [
  "",
  "activity",
  "analytics",
  "users",
  "projects",
  "studios",
  "jobs",
  "hiring",
  "collabs",
  "chats",
  "reports",
  "feedback",
  "system",
];

const ANTHEM_COOKIE = {
  version: 1,
  decidedAt: "2026-01-01T00:00:00.000Z",
  essential: true,
  functional: true,
  analytics: true,
};

async function signInAnthem(page, email, password) {
  await page.evaluateOnNewDocument((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, ANTHEM_COOKIE);
  await page.goto(`${ANTHEM_BASE}/auth`, { waitUntil: "networkidle2", timeout: 30_000 });
  await page.waitForSelector("input[type='email']");
  await page.click("input[type='email']", { clickCount: 3 });
  await page.type("input[type='email']", email, { delay: 5 });
  await page.click("input[type='password']", { clickCount: 3 });
  await page.type("input[type='password']", password, { delay: 5 });
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const t = await page.evaluate((el) => el.textContent ?? "", btn);
    if (t.trim() === "เข้าสู่ระบบ") {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 3000));
}

async function signInSolo(page, email, password) {
  await page.goto(`${SOLO_BASE}/auth`, { waitUntil: "networkidle2", timeout: 30_000 });
  await page.waitForSelector("#login-email, input[type='email']");
  const emailSel = (await page.$("#login-email")) ? "#login-email" : "input[type='email']";
  const passSel = (await page.$("#login-pass")) ? "#login-pass" : "input[type='password']";
  await page.click(emailSel, { clickCount: 3 });
  await page.type(emailSel, email, { delay: 5 });
  await page.click(passSel, { clickCount: 3 });
  await page.type(passSel, password, { delay: 5 });
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const t = await page.evaluate((el) => el.textContent ?? "", btn);
    if (/เข้าสู่ระบบ|sign in/i.test(t)) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 3000));
}

async function crawlSolo(page) {
  let fail = 0;
  for (const section of SOLO_SECTIONS) {
    const url = `${SOLO_BASE}/admin?section=${section}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 25_000 });
      const body = await page.evaluate(() => document.body?.innerText ?? "");
      if (/Application Error|Unhandled|service_role/i.test(body)) {
        console.log(`FAIL solo admin section=${section}`);
        fail++;
      } else {
        console.log(`OK   solo admin ${section}`);
      }
    } catch (e) {
      console.log(`FAIL solo admin ${section}: ${e.message}`);
      fail++;
    }
  }
  return fail;
}

async function crawlAnthem(page) {
  let fail = 0;
  for (const sub of ANTHEM_ADMIN) {
    const path = sub ? `/admin/${sub}` : "/admin";
    const url = `${ANTHEM_BASE}${path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 25_000 });
      if (!page.url().includes("/admin")) {
        console.log(`FAIL anthem ${path} — not on admin (${page.url()})`);
        fail++;
        continue;
      }
      const body = await page.evaluate(() => document.body?.innerText ?? "");
      if (/Application Error|Unhandled|service_role/i.test(body)) {
        console.log(`FAIL anthem ${path}`);
        fail++;
      } else {
        console.log(`OK   anthem ${path}`);
      }
    } catch (e) {
      console.log(`FAIL anthem ${path}: ${e.message}`);
      fail++;
    }
  }
  return fail;
}

async function main() {
  if (!hasE2EAdmin()) {
    console.log("SKIP admin crawl — set E2E_ADMIN_EMAIL/PASSWORD in .env.local");
    return;
  }

  console.log("==> Admin crawl (Puppeteer)\n");
  const browser = await launchBrowser();
  const page = await browser.newPage();
  let fail = 0;

  try {
    console.log("--- Solo admin ---");
    await signInSolo(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
    if (!page.url().includes("/admin") && !page.url().includes("/dashboard")) {
      console.log(`WARN solo post-login URL: ${page.url()}`);
    }
    fail += await crawlSolo(page);

    console.log("\n--- Anthem admin ---");
    await signInAnthem(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
    fail += await crawlAnthem(page);
  } finally {
    await browser.close();
  }

  if (fail) {
    console.log(`\n==> Admin crawl FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Admin crawl PASSED");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

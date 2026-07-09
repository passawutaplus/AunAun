import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/research/screenshots");
const BASE_URL = (process.env.E2E_BASE_URL ?? "https://aplus1.app").replace(/\/$/, "");
const FALLBACK_URL = (process.env.E2E_AUTH_BASE_URL ?? "https://aplus1-demo.vercel.app").replace(
  /\/$/,
  "",
);
const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? "phatsawut@demo.pixel100.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "pixel100-demo-seed";
const DEMO_SIGNUP_BLOCKED_TEXT = "ปิดการสมัครในโหมดทดสอบ";

const AUTH_ORIGINS = [BASE_URL, FALLBACK_URL].filter((value, index, all) => all.indexOf(value) === index);

const CONSENT_STATE = {
  version: 1,
  decidedAt: "2026-01-01T00:00:00.000Z",
  essential: true,
  functional: true,
  analytics: true,
};

/** @param {import('playwright').Page} page */
async function seedCookieConsent(page) {
  await page.addInitScript((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, CONSENT_STATE);
}

/** @param {import('playwright').Page} page */
async function waitForPage(page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  } catch {
    await page.waitForTimeout(2_000);
  }
}

/** @param {import('playwright').Page} page */
async function verifyPageRendered(page) {
  const text = (await page.locator("body").innerText()).trim();
  const images = await page.locator("img").count();
  return text.length > 80 && (images > 2 || /Aplus1|พื้นที่|ผลงาน|งาน/.test(text));
}

/** @param {string} outPath */
async function verifyScreenshot(outPath) {
  const stats = await sharp(outPath).stats();
  const mean = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
  const { size } = await import("node:fs/promises").then((fs) => fs.stat(outPath));
  return mean < 250 && size > 4_000;
}

/** @param {import('playwright').Page} page */
async function saveWebpScreenshot(page, outPath) {
  const tmpPath = `${outPath}.png`;
  await page.screenshot({ path: tmpPath, type: "png", fullPage: false });
  await sharp(tmpPath).webp({ quality: 85 }).toFile(outPath);
  await unlink(tmpPath);
}

/** @param {import('playwright').Page} page */
async function signInDemo(page, origin = FALLBACK_URL) {
  await page.goto(`${origin}/auth`);
  await waitForPage(page);
  await page.locator("#login-email").waitFor({ state: "visible", timeout: 30_000 });
  const quickPick = page.getByRole("button", { name: "ฟรีแลนซ์ทั่วไป" });
  if (await quickPick.isVisible().catch(() => false)) {
    await quickPick.click();
  } else {
    await page.locator("#login-email").fill(DEMO_EMAIL);
  }
  await page.locator("#login-pass").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 45_000 });
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} origins
 * @param {{
 *   name: string;
 *   path: string;
 *   fallbackPath?: string;
 *   width: number;
 *   height: number;
 *   beforeCapture?: (page: import('playwright').Page) => Promise<void>;
 *   optional?: boolean;
 * }} shot
 */
async function captureShot(page, origins, shot) {
  const outPath = join(OUT_DIR, `${shot.name}.webp`);
  let lastError = "unknown error";

  for (const origin of origins) {
    const path = origin === origins[0] ? shot.path : (shot.fallbackPath ?? shot.path);
    try {
      await page.setViewportSize({ width: shot.width, height: shot.height });
      await page.goto(`${origin}${path}`);
      await waitForPage(page);
      if (!(await verifyPageRendered(page))) {
        throw new Error("page did not render");
      }
      if (shot.beforeCapture) {
        await shot.beforeCapture(page);
      }
      await saveWebpScreenshot(page, outPath);
      if (!(await verifyScreenshot(outPath))) {
        throw new Error("screenshot appears blank");
      }
      console.log(`[ok] ${shot.name}.webp (${origin})`);
      return { name: shot.name, ok: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`[retry] ${shot.name}.webp on ${origin} — ${lastError}`);
    }
  }

  if (shot.optional) {
    console.warn(`[skip] ${shot.name}.webp — ${lastError}`);
    return { name: shot.name, ok: false, optional: true };
  }
  console.error(`[fail] ${shot.name}.webp — ${lastError}`);
  return { name: shot.name, ok: false };
}

const PUBLIC_SHOTS = [
  {
    name: "a-feed-desktop",
    path: "/",
    width: 1280,
    height: 800,
  },
  {
    name: "a-area-desktop",
    path: "/?mode=community",
    width: 1280,
    height: 800,
    beforeCapture: async (page) => {
      await page
        .locator("article, [data-testid='community-post'], main img")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => page.waitForTimeout(2_000));
    },
  },
  {
    name: "w-nav-mobile",
    path: "/",
    width: 390,
    height: 844,
  },
  {
    name: "u-area-mobile",
    path: "/?mode=community",
    width: 390,
    height: 844,
    beforeCapture: async (page) => {
      await page
        .locator("article, [data-testid='community-post'], main img")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => page.waitForTimeout(2_000));
    },
  },
  {
    name: "c-auth-signup-desktop",
    path: "/auth",
    width: 1280,
    height: 800,
    optional: true,
    beforeCapture: async (page) => {
      await page.locator("#login-email").waitFor({ state: "visible", timeout: 30_000 });
      await page.getByRole("tab", { name: /\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01|sign up/i }).click();
      const signupEmail = page.locator("#su-email");
      const demoBlocked = page.getByText(DEMO_SIGNUP_BLOCKED_TEXT, { exact: false });
      await Promise.race([
        signupEmail.waitFor({ state: "visible", timeout: 15_000 }),
        demoBlocked.waitFor({ state: "visible", timeout: 15_000 }),
      ]).catch(() => undefined);
    },
  },
  {
    name: "b-profile-desktop",
    path: "/u/00000000-0000-0000-0000-00000000a001",
    fallbackPath: "/u/phatsawut",
    width: 1280,
    height: 800,
    beforeCapture: async (page) => {
      await page.locator("h1, h2").first().waitFor({ state: "visible", timeout: 35_000 });
    },
  },
  {
    name: "g-jobs-desktop",
    path: "/jobs",
    width: 1280,
    height: 800,
  },
  {
    name: "m-studio-desktop",
    path: "/s/doi-studio",
    width: 1280,
    height: 800,
  },
];

const AUTH_SHOTS = [
  {
    name: "i-chat-desktop",
    path: "/chat",
    width: 1280,
    height: 800,
    optional: true,
    beforeCapture: async (page) => {
      await page.getByRole("heading", { name: "ข้อความ" }).waitFor({ state: "visible", timeout: 15_000 });
      const thread = page.locator("aside ul li button").first();
      if (await thread.isVisible().catch(() => false)) {
        await thread.click();
        await page.waitForURL(/\/chat\/[0-9a-f-]+/i, { timeout: 10_000 }).catch(() => undefined);
      }
    },
  },
  {
    name: "o-settings-desktop",
    path: "/settings",
    width: 1280,
    height: 800,
    optional: true,
    beforeCapture: async (page) => {
      await page.getByRole("heading", { name: /ตั้งค่า|settings/i }).first().waitFor({
        state: "visible",
        timeout: 15_000,
      });
    },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Capturing UX review screenshots");
  console.log(`Primary origin: ${BASE_URL}`);
  console.log(`Fallback origin: ${FALLBACK_URL}`);
  console.log(`Output: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  await seedCookieConsent(page);

  const results = [];

  for (const shot of PUBLIC_SHOTS) {
    const origins = shot.name === "c-auth-signup-desktop" ? AUTH_ORIGINS : AUTH_ORIGINS;
    results.push(await captureShot(page, origins, shot));
  }

  if (DEMO_PASSWORD) {
    try {
      await signInDemo(page, FALLBACK_URL);
      for (const shot of AUTH_SHOTS) {
        results.push(await captureShot(page, [FALLBACK_URL], shot));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[skip] authenticated shots — login failed: ${message}`);
      for (const shot of AUTH_SHOTS) {
        results.push({ name: shot.name, ok: false, optional: true });
      }
    }
  } else {
    console.warn("[skip] authenticated shots — E2E_DEMO_PASSWORD not set");
    for (const shot of AUTH_SHOTS) {
      results.push({ name: shot.name, ok: false, optional: true });
    }
  }

  await browser.close();

  const created = results.filter((r) => r.ok).map((r) => `${r.name}.webp`);
  const failed = results.filter((r) => !r.ok);

  console.log("\nCreated:");
  for (const file of created) {
    console.log(`  - ${file}`);
  }
  if (failed.length) {
    console.log("\nFailed/skipped:");
    for (const file of failed) {
      console.log(`  - ${file.name}.webp`);
    }
  }

  const requiredFailed = failed.filter((r) => !r.optional);
  if (requiredFailed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

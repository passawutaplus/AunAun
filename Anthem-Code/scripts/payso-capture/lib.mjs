/**
 * Shared helpers for the Payso screenshot bot.
 * Uses the Edge that is already installed (playwright-core, channel "msedge") — no browser download.
 * Login state lives in .auth/<role>.json (git-ignored). The bot never types a password: a person logs in once
 * in a visible window (login.mjs) and the saved session is reused.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, "../..");
export const BASE = (process.env.PAYSO_BASE_URL || "http://127.0.0.1:5199").replace(/\/$/, "");
export const OUT = path.join(APP_ROOT, "docs/payso-submission/screenshots");
export const AUTH_DIR = path.join(here, ".auth");
export const DEBUG_DIR = path.join(here, ".debug");
export const statePath = (role) => path.join(AUTH_DIR, `${role}.json`);

/** Thai national ID that passes the checksum used by the app. It is generated, not a real person's number. */
export function fakeThaiNationalId(seed = "1100200300400") {
  const d = seed.replace(/\D/g, "").slice(0, 12).padEnd(12, "0").split("").map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (13 - i), 0);
  return d.join("") + String((11 - (sum % 11)) % 10);
}

async function isUp(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return r.status < 500;
  } catch {
    return false;
  }
}

/** Make sure the app answers on BASE. Starts `vite` itself for local URLs; returns a stop() function. */
export async function ensureServer() {
  if (await isUp(BASE)) return () => {};
  const u = new URL(BASE);
  if (!["127.0.0.1", "localhost"].includes(u.hostname)) {
    throw new Error(`${BASE} is not reachable and is not a local address — start it or fix PAYSO_BASE_URL.`);
  }
  console.log(`[server] starting vite on ${BASE} …`);
  const child = spawn("npx", ["vite", "--port", u.port || "5199", "--host", u.hostname, "--strictPort"], {
    cwd: APP_ROOT,
    shell: process.platform === "win32",
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    if (await isUp(BASE)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!(await isUp(BASE))) {
    child.kill();
    throw new Error("vite did not start in 60 s (is .env.local present with VITE_SUPABASE_URL / key?)");
  }
  return () => {
    try {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill();
    } catch {
      /* already gone */
    }
  };
}

export async function openContext({ role = null, headless = true } = {}) {
  const browser = await chromium.launch({ channel: "msedge", headless });
  const opts = { viewport: { width: 1280, height: 900 }, locale: "th-TH", timezoneId: "Asia/Bangkok" };
  if (role && fs.existsSync(statePath(role))) opts.storageState = statePath(role);
  const context = await browser.newContext(opts);
  // Same look as the public-page screenshots: essential cookies only, light theme.
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        "anthem-cookie-consent",
        JSON.stringify({ version: 1, decidedAt: new Date().toISOString(), essential: true, functional: false, analytics: false }),
      );
      localStorage.setItem("an1hem-theme", "light");
    } catch {
      /* storage blocked */
    }
  });
  return { browser, context };
}

export async function settle(page, ms = 600) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/** Blur things that must not be readable in a screenshot (selectors or locators). */
export async function blur(page, targets = []) {
  for (const t of targets) {
    const loc = typeof t === "string" ? page.locator(t) : t;
    await loc
      .evaluateAll((els) => els.forEach((e) => e.style.setProperty("filter", "blur(8px)", "important")))
      .catch(() => {});
  }
}

export async function shot(page, code, { mask = [], fullPage = false, note = "" } = {}) {
  await settle(page);
  await blur(page, mask);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${code}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`OK    ${code}  ${note}`);
  return file;
}

export async function debugShot(page, label) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const file = path.join(DEBUG_DIR, `${label}-${Date.now()}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

/** Fill the input that belongs to a label (works when <Label> is not wired with htmlFor). */
export async function fillByLabel(page, labelRe, value) {
  const byLabel = page.getByLabel(labelRe).first();
  if ((await byLabel.count()) > 0) {
    await byLabel.fill(value);
    return true;
  }
  const lab = page.locator("label", { hasText: labelRe }).first();
  if ((await lab.count()) > 0) {
    const input = lab.locator("xpath=following::input[1]");
    if ((await input.count()) > 0) {
      await input.fill(value);
      return true;
    }
  }
  return false;
}

/** Try several ways to fill a field; log a MISS instead of throwing so one odd field does not stop the run. */
export async function tryFill(page, what, labelRe, value, placeholderRe = null) {
  if (await fillByLabel(page, labelRe, value).catch(() => false)) return true;
  if (placeholderRe) {
    const p = page.getByPlaceholder(placeholderRe).first();
    if ((await p.count()) > 0) {
      await p.fill(value).catch(() => {});
      return true;
    }
  }
  console.log(`MISS  field "${what}"`);
  return false;
}

/** Scroll every scrollable box on the page to its end (PDPA reader needs to be read to the end). */
export async function scrollAllToEnd(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) {
        el.scrollTop = el.scrollHeight;
        el.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    }
  });
}

/** Obviously-fake sample documents (JPEG) so upload slots show a filled state. They say SAMPLE on them. */
export async function makeSampleDocs(context) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "payso-samples-"));
  const page = await context.newPage();
  const docs = {
    id_front: ["บัตรประชาชน (ตัวอย่าง)", "SAMPLE ID CARD", "ไม่ใช่เอกสารจริง — ใช้ทดสอบระบบเท่านั้น"],
    selfie: ["เซลฟี่ถือบัตร (ตัวอย่าง)", "SAMPLE SELFIE", "ไม่ใช่รูปบุคคลจริง — ใช้ทดสอบระบบเท่านั้น"],
    bank_book: ["หน้าสมุดบัญชี (ตัวอย่าง)", "SAMPLE BANK BOOK", "ไม่ใช่เอกสารจริง — ใช้ทดสอบระบบเท่านั้น"],
  };
  const files = {};
  for (const [key, [title, big, small]] of Object.entries(docs)) {
    await page.setViewportSize({ width: 1200, height: 760 });
    await page.setContent(
      `<body style="margin:0;font-family:Tahoma,sans-serif;background:#e8ecf2"><div style="margin:40px;height:680px;border:6px dashed #5b6b88;border-radius:28px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px"><div style="font-size:44px;color:#34415c">${title}</div><div style="font-size:88px;font-weight:800;color:#c0392b;letter-spacing:6px">${big}</div><div style="font-size:30px;color:#5b6b88">${small}</div></div></body>`,
    );
    const file = path.join(dir, `${key}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 90 });
    files[key] = file;
  }
  await page.close();
  return files;
}

export function requireLogin(page, role) {
  const url = page.url();
  if (/\/auth(\/|\?|$)/.test(url) || /\/login/.test(url)) {
    throw new Error(`Not signed in as "${role}". Run: node scripts/payso-capture/login.mjs ${role}`);
  }
}

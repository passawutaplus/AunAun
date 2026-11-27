#!/usr/bin/env node
/**
 * Redesign page check: compares a page of the real app with the same page of the
 * design mock (samecor-handoff/site) at 1440px and 390px.
 *
 * Checks per page and width:
 *   - no horizontal overflow (lists the elements that stick out)
 *   - work images are not cropped: every `img[data-sc-work]` box keeps the image's own aspect ratio
 *   - prefers-reduced-motion: reduce → no running animations or transitions, also after scrolling
 *   - screenshots of app and mock side by side for a visual comparison
 *
 * Usage:
 *   node scripts/redesign-check.mjs --app http://127.0.0.1:8080 --mock http://127.0.0.1:8765 \
 *     --page main=/:#main [--page work=/showcase/<id>:#work] [--out <dir>]
 * The mock part after ":" is a hash route of the mock; leave it empty to skip the mock screenshot.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const pages = args.flatMap((a, i) => (a === "--page" ? [args[i + 1]] : [])).map((spec) => {
  const [name, rest] = spec.split("=");
  const [appPath, mockHash = ""] = rest.split(":");
  return { name, appPath, mockHash };
});
const appBase = opt("app", "http://127.0.0.1:8080");
const mockBase = opt("mock", "http://127.0.0.1:8765");
const outDir = opt("out", join(tmpdir(), "redesign-shots"));
mkdirSync(outDir, { recursive: true });

if (!pages.length) {
  console.error("Give at least one --page name=/app/path:#mock-route");
  process.exit(2);
}

const VIEWPORTS = [
  { label: "1440", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
];

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts?.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

const overflowScript = () => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1) {
      offenders.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : ""} right=${Math.round(r.right)}`);
      if (offenders.length >= 8) break;
    }
  }
  return { vw, doc, overflow: doc > vw + 1, offenders };
};

const cropScript = () =>
  [...document.querySelectorAll("img[data-sc-work]")]
    .filter((img) => img.complete && img.naturalWidth && img.getBoundingClientRect().width)
    .map((img) => {
      const r = img.getBoundingClientRect();
      const natural = img.naturalWidth / img.naturalHeight;
      const box = r.width / r.height;
      return { src: img.currentSrc.slice(-60), natural: +natural.toFixed(3), box: +box.toFixed(3), off: Math.abs(box - natural) / natural };
    })
    .filter((x) => x.off > 0.015);

const motionScript = () =>
  document.getAnimations().filter((a) => a.playState === "running").map((a) => `${a.constructor.name}:${a.animationName ?? a.transitionProperty ?? ""}`);

const browser = await chromium.launch();
let failed = 0;
try {
  for (const p of pages) {
    for (const v of VIEWPORTS) {
      const { label, ...ctxOpts } = v;
      const ctx = await browser.newContext(ctxOpts);
      const page = await ctx.newPage();
      await page.goto(appBase + p.appPath, { waitUntil: "domcontentloaded" });
      await settle(page);
      const ov = await page.evaluate(overflowScript);
      const crops = await page.evaluate(cropScript);
      await page.screenshot({ path: join(outDir, `${p.name}-${label}-app.png`), fullPage: true });
      if (p.mockHash) {
        const mock = await ctx.newPage();
        await mock.goto(mockBase + "/" + p.mockHash, { waitUntil: "domcontentloaded" });
        await settle(mock);
        await mock.screenshot({ path: join(outDir, `${p.name}-${label}-mock.png`), fullPage: true });
      }
      await ctx.close();

      const rctx = await browser.newContext({ ...ctxOpts, reducedMotion: "reduce" });
      const rpage = await rctx.newPage();
      await rpage.goto(appBase + p.appPath, { waitUntil: "domcontentloaded" });
      await settle(rpage);
      const running = await rpage.evaluate(motionScript);
      await rctx.close();

      const ok = !ov.overflow && !crops.length && !running.length;
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"} ${p.name} @${label}`);
      if (ov.overflow) console.log(`  overflow: page ${ov.doc}px > viewport ${ov.vw}px · ${ov.offenders.join(" | ")}`);
      for (const c of crops) console.log(`  cropped: ${c.src} natural ${c.natural} vs box ${c.box}`);
      if (running.length) console.log(`  reduced-motion still animating: ${running.slice(0, 6).join(", ")}`);
    }
  }
} finally {
  await browser.close();
}
console.log(`screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);

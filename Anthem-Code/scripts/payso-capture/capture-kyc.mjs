#!/usr/bin/env node
/**
 * Screenshots F-10…F-14 (KYC wizard) with obviously fake data and sample documents.
 *
 *   node scripts/payso-capture/capture-kyc.mjs              # fills the wizard, shoots F-10…F-13, does NOT submit
 *   node scripts/payso-capture/capture-kyc.mjs --submit     # also submits and shoots F-14 (creates a PENDING request for the test account)
 *
 * Needs a saved session: node scripts/payso-capture/login.mjs seller   (a TEST account, never a real person's)
 * Uploading a sample document writes a file to the test account's private KYC folder; submitting creates a row in the
 * review queue. Clean both up afterwards (see README).
 */
import {
  BASE, blur, debugShot, ensureServer, fakeThaiNationalId, makeSampleDocs, openContext, requireLogin,
  scrollAllToEnd, settle, shot, tryFill,
} from "./lib.mjs";

const ROLE = process.env.PAYSO_KYC_ROLE || "seller";
const SUBMIT = process.argv.includes("--submit");
const nid = fakeThaiNationalId("1100200300400");

const stopServer = await ensureServer();
const { browser, context } = await openContext({ role: ROLE });
const page = await context.newPage();
let failed = false;

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    failed = true;
    const f = await debugShot(page, name.replace(/\W+/g, "_"));
    console.error(`FAIL  ${name}: ${e.message.split("\n")[0]}  (debug: ${f})`);
    throw e;
  }
}

async function next() {
  await page.getByRole("button", { name: /ถัดไป/ }).click();
  await settle(page, 400);
}

async function pickFirstOption(trigger, preferred) {
  await trigger.click();
  const opt = preferred
    ? page.getByRole("option", { name: preferred }).first()
    : page.getByRole("option").first();
  await opt.click();
  await page.waitForTimeout(250);
}

try {
  await page.goto(`${BASE}/verify`);
  await settle(page, 1200);
  requireLogin(page, ROLE);
  const docs = await makeSampleDocs(context);

  // ---------- step 1: contact + PDPA ----------
  await step("kyc-step1", async () => {
    await tryFill(page, "phone", /เบอร์โทร/, "0812345678", /08x/);
    await tryFill(page, "contact email", /อีเมลติดต่อ/, "kyc-test@example.com", /you@email/);
    await tryFill(page, "LINE ID", /LINE ID/, "@test-account", /@username/);
    await scrollAllToEnd(page);
    await page.waitForTimeout(600);
    const consent = page.getByRole("checkbox").first();
    await consent.scrollIntoViewIfNeeded();
    await consent.check({ timeout: 4000 }).catch(async () => consent.click());
    await shot(page, "F-10", { note: "step 1 contact + PDPA" });
  });
  await next();

  // ---------- step 2: identity + documents ----------
  await step("kyc-step2", async () => {
    await tryFill(page, "given name", /ชื่อ \(ตามบัตร\)/, "ทดสอบ", /ภาสวุฒิ/);
    await tryFill(page, "family name", /นามสกุล \(ตามบัตร\)/, "ระบบ", /แซ่ล้อ/);
    await tryFill(page, "national id", /เลขบัตรประชาชน/, nid);
    const dates = page.locator('input[type="date"]');
    if ((await dates.count()) >= 1) await dates.nth(0).fill("1990-01-15");
    if ((await dates.count()) >= 2) await dates.nth(1).fill("2032-01-15");
    await tryFill(page, "address line 1", /ที่อยู่ตามบัตร/, "99/9 หมู่ 9 ซอยทดสอบ (ข้อมูลตัวอย่าง)");
    const province = page.locator('[id$="-province"]').first();
    if ((await province.count()) > 0) await pickFirstOption(province, /กรุงเทพ/);
    const district = page.locator('[id$="-district"]').first();
    if ((await district.count()) > 0) await pickFirstOption(district);
    const sub = page.locator('[id$="-subdistrict"]').first();
    if ((await sub.count()) > 0) await pickFirstOption(sub);
    const postal = page.locator('[id$="-postal"], [id$="-postalCode"], [id$="-zip"]').first();
    if ((await postal.count()) > 0 && !(await postal.inputValue())) await postal.fill("10110");

    const files = page.locator('input[type="file"]');
    const n = await files.count();
    if (n >= 1) await files.nth(0).setInputFiles(docs.id_front);
    if (n >= 2) await files.nth(1).setInputFiles(docs.selfie);
    if (n < 2) console.log(`MISS  expected 2 file inputs, found ${n}`);
    await page.waitForTimeout(3500); // compress + upload + quality check
    await shot(page, "F-11", { fullPage: true, note: "step 2 identity + documents (fake data)" });
  });
  await next();

  // ---------- step 3: bank account ----------
  await step("kyc-step3", async () => {
    await tryFill(page, "bank name", /ธนาคาร/, "กสิกรไทย (ตัวอย่าง)", /กสิกรไทย/);
    await tryFill(page, "account number", /เลขบัญชี/, "1234567890");
    await tryFill(page, "account name", /ชื่อบัญชี/, "ทดสอบ ระบบ");
    const files = page.locator('input[type="file"]');
    if ((await files.count()) >= 1) await files.last().setInputFiles(docs.bank_book);
    await page.waitForTimeout(3500);
    await shot(page, "F-12", { fullPage: true, note: "step 3 bank account (fake data)" });
  });
  await next();

  // ---------- step 4: declarations ----------
  await step("kyc-step4", async () => {
    await page.getByText("ไม่ได้เป็นบุคคลที่มีสถานภาพทางการเมือง").first().click();
    const sanctionsNone = page.getByText("ไม่ใช่", { exact: true }).first();
    if ((await sanctionsNone.count()) > 0) await sanctionsNone.click().catch(() => {});
    const attest = page.getByRole("checkbox").last();
    if ((await attest.count()) > 0) await attest.check().catch(() => {});
    await page.getByPlaceholder("CONFIRM").fill("CONFIRM");
    await shot(page, "F-13", { fullPage: true, note: "step 4 declarations (not submitted)" });
  });

  if (SUBMIT) {
    await step("kyc-submit", async () => {
      await page.getByRole("button", { name: /Submit Verification/ }).click();
      await page.waitForTimeout(6000);
      await shot(page, "F-14", { fullPage: true, note: "after submit (pending review)" });
    });
  } else {
    console.log("SKIP  F-14 (run with --submit to create the pending request)");
  }
} catch (e) {
  if (!failed) console.error(`FAIL  ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  stopServer();
}

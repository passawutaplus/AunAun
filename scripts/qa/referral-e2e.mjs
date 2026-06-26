/**
 * Referral E2E smoke — API + optional browser against demo deploy.
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/qa/referral-e2e.mjs
 *   E2E_BASE_URL=https://1px-demo.vercel.app E2E_DEMO_PASSWORD=... node scripts/qa/referral-e2e.mjs
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
const baseUrl = (process.env.E2E_BASE_URL || process.env.ANTHEM_BASE_URL || "https://1px-demo.vercel.app").replace(/\/$/, "");
const supabaseUrl = `https://${projectRef}.supabase.co`;
const demoEmail = process.env.E2E_DEMO_EMAIL || "phatsawut@demo.an1hem.app";
const demoPassword = process.env.E2E_DEMO_PASSWORD || "pixel100-demo-seed";
/** Seed demo creator (phatsawut@demo.an1hem.app) — fallback when admin email lookup fails */
const SEED_DEMO_USER_ID = "00000000-0000-0000-0000-00000000a000";

let fail = 0;
function ok(msg) {
  console.log(`OK   ${msg}`);
}
function bad(msg) {
  console.log(`FAIL ${msg}`);
  fail++;
}

async function mgmt(path, body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function getAnonKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${mgmtToken}` },
  });
  const keys = await res.json();
  const anon = keys.find((k) => k.name === "anon");
  if (!anon?.api_key) throw new Error("anon key not found");
  return anon.api_key;
}

async function getServiceRoleKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${mgmtToken}` },
  });
  const keys = await res.json();
  const sr = keys.find((k) => k.name === "service_role");
  if (!sr?.api_key) throw new Error("service_role key not found");
  return sr.api_key;
}

async function resolveDemoUserId(serviceRole) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(demoEmail)}`, {
    headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
  });
  if (res.ok) {
    const users = await res.json();
    const user = users?.users?.[0];
    if (user?.id) return user.id;
  }
  if (demoEmail.endsWith("@demo.an1hem.app")) return SEED_DEMO_USER_ID;
  throw new Error(`demo user not found: ${demoEmail}`);
}

async function ensureDemoPassword(serviceRole) {
  const userId = await resolveDemoUserId(serviceRole);
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: demoPassword, email_confirm: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`admin password update ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function login(anon) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description ?? body.msg ?? `auth ${res.status}`);
  return body.access_token;
}

async function rpc(anon, token, fn, args = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function checkDemoRoute(path) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  const html = await res.text();
  return { status: res.status, html, url: res.url };
}

async function maybeBrowserCheck() {
  const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    join(homedir(), ".cache/puppeteer/chrome/win64-*/chrome-win64/chrome.exe"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  let chromePath;
  for (const p of chromeCandidates) {
    if (p.includes("*")) continue;
    if (existsSync(p)) {
      chromePath = p;
      break;
    }
  }
  if (!chromePath) {
    console.log("SKIP browser /referrals UI — Chrome not configured");
    return;
  }

  let puppeteer;
  try {
    const mod = await import("puppeteer");
    puppeteer = mod.default ?? mod;
  } catch {
    console.log("SKIP browser /referrals UI — puppeteer not installed");
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle2", timeout: 45_000 });
    await page.waitForSelector("input[type='email']", { timeout: 15_000 });
    await page.click("input[type='email']", { clickCount: 3 });
    await page.type("input[type='email']", demoEmail, { delay: 5 });
    await page.click("input[type='password']", { clickCount: 3 });
    await page.type("input[type='password']", demoPassword, { delay: 5 });
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent ?? "", btn);
      if (text.trim() === "เข้าสู่ระบบ") {
        await btn.click();
        break;
      }
    }
    await page.waitForFunction(() => !location.pathname.startsWith("/auth"), { timeout: 25_000 });
    await page.goto(`${baseUrl}/referrals`, { waitUntil: "networkidle2", timeout: 45_000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!/ชวนเพื่อน/.test(bodyText)) {
      bad("browser /referrals missing Thai referral copy");
      return;
    }
    if (!bodyText.includes("?ref=")) {
      bad("browser /referrals missing referral link");
      return;
    }
    ok(`browser /referrals renders referral link on ${baseUrl}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`==> Referral E2E @ ${baseUrl}\n`);
  if (!mgmtToken) {
    bad("SUPABASE_ACCESS_TOKEN required");
    process.exit(1);
  }

  try {
    const rows = await mgmt("/database/query", {
      query: "SELECT name FROM supabase_migrations.schema_migrations WHERE name = '20260622160000_anthem_referral_affiliate';",
    });
    if (!rows?.length) bad("referral migration not applied");
    else ok("migration 20260622160000_anthem_referral_affiliate applied");
  } catch (e) {
    bad(`migration check: ${e.message}`);
  }

  try {
    const tables = await mgmt("/database/query", {
      query: "SELECT tablename FROM pg_tables WHERE schemaname='shared' AND tablename LIKE 'referral%' ORDER BY 1;",
    });
    if ((tables?.length ?? 0) < 4) bad(`shared referral tables missing (${tables?.length ?? 0})`);
    else ok(`shared referral tables (${tables.length})`);
  } catch (e) {
    bad(`schema check: ${e.message}`);
  }

  const anon = await getAnonKey();
  const serviceRole = await getServiceRoleKey();

  try {
    await ensureDemoPassword(serviceRole);
    ok(`demo password synced for ${demoEmail}`);
  } catch (e) {
    bad(`demo password: ${e.message}`);
  }

  let token;
  try {
    token = await login(anon);
    ok(`demo login ${demoEmail}`);
  } catch (e) {
    bad(`demo login: ${e.message}`);
    console.log(`\n==> Referral E2E FAILED (${fail})`);
    process.exit(1);
  }

  const dash = await rpc(anon, token, "get_referral_dashboard");
  if (dash.status !== 200 || !dash.data?.code) {
    bad(`get_referral_dashboard → ${dash.status} ${JSON.stringify(dash.data).slice(0, 200)}`);
  } else {
    const d = dash.data;
    ok(`get_referral_dashboard code=${d.code} signup=${d.signup_reward_px} referrer=${d.referrer_reward_px}`);
    if (typeof d.invited_count !== "number") bad("dashboard invited_count missing");
    else ok(`dashboard invited=${d.invited_count} qualified=${d.qualified_count}`);
  }

  const anonDash = await rpc(anon, anon, "get_referral_dashboard");
  if (anonDash.status === 200) bad("anon can call get_referral_dashboard (should be blocked)");
  else ok(`anon blocked from get_referral_dashboard (${anonDash.status})`);

  const route = await checkDemoRoute("/referrals");
  if (route.status >= 400) bad(`/referrals HTTP ${route.status}`);
  else ok(`/referrals shell HTTP ${route.status}`);

  const refLanding = await checkDemoRoute("/?ref=TESTCODE12");
  if (refLanding.status >= 400) bad("/?ref= landing failed");
  else ok("/?ref= landing HTTP 200");

  await maybeBrowserCheck();

  console.log(fail ? `\n==> Referral E2E FAILED (${fail})` : "\n==> Referral E2E PASSED");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(`==> Referral E2E error: ${e.message}`);
  process.exit(1);
});

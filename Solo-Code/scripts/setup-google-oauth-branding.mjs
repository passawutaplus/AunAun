#!/usr/bin/env node
/**
 * Print + open Google OAuth branding checklist (So1o + Aplus1 unified).
 * Cannot edit Google Console via API without Cloud credentials — opens Dashboard for you.
 *
 * Usage: node scripts/setup-google-oauth-branding.mjs [--open]
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ECOSYSTEM_OAUTH,
  GOOGLE_AUTHORIZED_DOMAINS,
  GOOGLE_CONSOLE_URLS,
  GOOGLE_JS_ORIGINS,
  GOOGLE_REDIRECT_URIS,
  SUPABASE_CUSTOM_AUTH_HOST,
  SUPABASE_PROJECT_REF,
} from "./ecosystem-oauth-brand.mjs";

const openBrowser = process.argv.includes("--open");
const solo = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadToken() {
  const env = readFileSync(join(solo, ".env"), "utf8");
  const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (!m) throw new Error("SUPABASE_ACCESS_TOKEN missing in Solo-Code/.env");
  return m[1].trim();
}

async function orgPlan() {
  const token = loadToken();
  const proj = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const org = await fetch(`https://api.supabase.com/v1/organizations/${proj.organization_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  return org.plan ?? "unknown";
}

function openUrl(url) {
  if (!openBrowser) return;
  if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: true });
  } else if (process.platform === "darwin") {
    spawnSync("open", [url], { stdio: "ignore" });
  } else {
    spawnSync("xdg-open", [url], { stdio: "ignore" });
  }
}

const plan = await orgPlan();
const customDomainOk = plan !== "free" && plan !== "unknown";

console.log("");
console.log("═══════════════════════════════════════════════════════════");
console.log(" Google OAuth branding — So1o & Aplus1 (unified Supabase)");
console.log("═══════════════════════════════════════════════════════════");
console.log("");
console.log(`Supabase org plan: ${plan}`);
if (!customDomainOk) {
  console.log("");
  console.log("⚠  เปลี่ยนข้อความ “ไปยัง …supabase.co” ต้องอัปเกรด Supabase Pro + Custom Domain");
  console.log("   ตอนนี้ทำได้แค่ชื่อแอป + โลโก้บนหน้า Google (ด้านล่าง)");
  console.log(`   เป้าหมายถัดไป: ${SUPABASE_CUSTOM_AUTH_HOST}`);
  console.log("   https://supabase.com/docs/guides/platform/custom-domains");
}
console.log("");
console.log("── 1. OAuth consent screen → Branding ──");
console.log(`   ${GOOGLE_CONSOLE_URLS.branding}`);
console.log("");
console.log("   App name:        ", ECOSYSTEM_OAUTH.appName);
console.log("   User support:    ", ECOSYSTEM_OAUTH.supportEmail);
console.log("   Home page:       ", ECOSYSTEM_OAUTH.homePage);
console.log("   Privacy policy:  ", ECOSYSTEM_OAUTH.privacyPolicy);
console.log("   Terms of service:", ECOSYSTEM_OAUTH.termsOfService);
console.log("   App logo URL:    ", ECOSYSTEM_OAUTH.appLogoUrl);
console.log("   Authorized domains:", GOOGLE_AUTHORIZED_DOMAINS.join(", "));
console.log("");
console.log("   → Save แล้วกด Submit for verification (ใช้เวลา ~2–5 วันทำการ)");
console.log("");
console.log("── 2. OAuth client → Origins & redirect URIs ──");
console.log(`   ${GOOGLE_CONSOLE_URLS.credentials}`);
console.log("");
console.log("   JavaScript origins:");
for (const o of GOOGLE_JS_ORIGINS) console.log("     •", o);
console.log("");
console.log("   Redirect URIs:");
for (const u of GOOGLE_REDIRECT_URIS) console.log("     •", u);
console.log("");
console.log("── 3. หลัง Supabase Pro + auth.aplus1.app (optional) ──");
console.log("   DNS: CNAME auth.aplus1.app →", `${SUPABASE_PROJECT_REF}.supabase.co`);
console.log("   Google redirect URI เพิ่ม:");
console.log(`     https://${SUPABASE_CUSTOM_AUTH_HOST}/auth/v1/callback`);
console.log("   CLI: supabase domains create --project-ref", SUPABASE_PROJECT_REF);
console.log("");
console.log("── หมายเหตุ ──");
console.log("   • ข้อความ “ไปยัง zkflkpbmbozrchqncpzi.supabase.co” = ปกติ (ยังไม่มี custom domain)");
console.log("   • หลัง verify brand จะเห็นชื่อ “So1o & Aplus1” + โลโก้ชัดขึ้น");
console.log("   • Custom domain ถึงจะเปลี่ยนโดเมนใน “ไปยัง …” เป็น auth.aplus1.app");
console.log("");

if (openBrowser) {
  console.log("→ Opening Google Cloud Console tabs…");
  openUrl(GOOGLE_CONSOLE_URLS.branding);
  openUrl(GOOGLE_CONSOLE_URLS.credentials);
}

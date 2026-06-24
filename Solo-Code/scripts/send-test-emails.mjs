/**
 * Send all So1o email templates to a test inbox.
 * Usage: node scripts/send-test-emails.mjs you@example.com
 * Requires LOVABLE_API_KEY in .env (or env).
 */
import * as React from "react";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@react-email/components";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { TEMPLATES } from "../src/lib/email-templates/registry.ts";
import { SignupEmail } from "../src/lib/email-templates/signup.tsx";
import { InviteEmail } from "../src/lib/email-templates/invite.tsx";
import { MagicLinkEmail } from "../src/lib/email-templates/magic-link.tsx";
import { RecoveryEmail } from "../src/lib/email-templates/recovery.tsx";
import { EmailChangeEmail } from "../src/lib/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../src/lib/email-templates/reauthentication.tsx";
import { SITE_NAME, SITE_URL } from "../src/lib/siteUrl.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const to = process.argv[2] || process.env.TEST_EMAIL;
if (!to) {
  console.error("Usage: node scripts/send-test-emails.mjs <email>");
  process.exit(1);
}

const apiKey = process.env.LOVABLE_API_KEY;
if (!apiKey) {
  console.error("LOVABLE_API_KEY not set in .env");
  process.exit(1);
}

const SENDER_DOMAIN = "notify.solofreelancer.com";
const FROM_DOMAIN = "solofreelancer.com";

const AUTH = {
  signup: {
    component: SignupEmail,
    subject: "ยืนยันอีเมลของคุณ — So1o",
    data: {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      recipient: to,
      confirmationUrl: `${SITE_URL}/auth/confirm`,
    },
  },
  invite: {
    component: InviteEmail,
    subject: "คุณได้รับคำเชิญเข้าร่วม So1o",
    data: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/invite` },
  },
  magiclink: {
    component: MagicLinkEmail,
    subject: "ลิงก์เข้าสู่ระบบ So1o",
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/magic` },
  },
  recovery: {
    component: RecoveryEmail,
    subject: "รีเซ็ตรหัสผ่าน So1o",
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/recovery` },
  },
  email_change: {
    component: EmailChangeEmail,
    subject: "ยืนยันการเปลี่ยนอีเมล — So1o",
    data: {
      siteName: SITE_NAME,
      oldEmail: to,
      email: to,
      newEmail: `new-${to}`,
      confirmationUrl: `${SITE_URL}/auth/email-change`,
    },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    subject: "รหัสยืนยันตัวตนของคุณ — So1o",
    data: { token: "482910" },
  },
};

async function send(label, subject, element) {
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const messageId = crypto.randomUUID();
  await sendLovableEmail(
    {
      run_id: `test-${label}-${Date.now()}`,
      to,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: `[ทดสอบ] ${subject}`,
      html,
      text,
      purpose: "transactional",
      label: `test-${label}`,
      message_id: messageId,
      idempotency_key: `test-email-${label}-${to}`,
    },
    { apiKey },
  );
  console.log(`✓ ${label}`);
}

console.log(`Sending all templates to ${to}…\n`);

for (const [name, entry] of Object.entries(TEMPLATES)) {
  if (!entry.previewData) continue;
  const subject =
    typeof entry.subject === "function" ? entry.subject(entry.previewData) : entry.subject;
  await send(name, subject, React.createElement(entry.component, entry.previewData));
}

for (const [name, { component, subject, data }] of Object.entries(AUTH)) {
  await send(`auth-${name}`, subject, React.createElement(component, data));
}

console.log(
  `\nDone — ${Object.keys(TEMPLATES).length + Object.keys(AUTH).length} templates queued to ${to}`,
);

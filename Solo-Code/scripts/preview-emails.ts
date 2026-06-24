/**
 * Renders all email templates to email-previews/ for local inspection.
 * Run: npx tsx scripts/preview-emails.ts
 */
import * as React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/components";
import { TEMPLATES } from "../src/lib/email-templates/registry.ts";
import { SignupEmail } from "../src/lib/email-templates/signup.tsx";
import { InviteEmail } from "../src/lib/email-templates/invite.tsx";
import { MagicLinkEmail } from "../src/lib/email-templates/magic-link.tsx";
import { RecoveryEmail } from "../src/lib/email-templates/recovery.tsx";
import { EmailChangeEmail } from "../src/lib/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../src/lib/email-templates/reauthentication.tsx";
import { SITE_NAME, SITE_URL } from "../src/lib/siteUrl.ts";

const OUT = join(import.meta.dirname ?? ".", "..", "email-previews");

const AUTH_TEMPLATES: Record<
  string,
  { component: React.ComponentType<any>; data: Record<string, unknown> }
> = {
  signup: {
    component: SignupEmail,
    data: {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      recipient: "user@example.test",
      confirmationUrl: `${SITE_URL}/auth/confirm`,
    },
  },
  invite: {
    component: InviteEmail,
    data: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/invite` },
  },
  magiclink: {
    component: MagicLinkEmail,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/magic` },
  },
  recovery: {
    component: RecoveryEmail,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/recovery` },
  },
  email_change: {
    component: EmailChangeEmail,
    data: {
      siteName: SITE_NAME,
      oldEmail: "old@example.test",
      email: "old@example.test",
      newEmail: "new@example.test",
      confirmationUrl: `${SITE_URL}/auth/email-change`,
    },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    data: { token: "847291" },
  },
};

type PreviewItem = { id: string; group: string; label: string; subject: string; file: string };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const items: PreviewItem[] = [];

  for (const [name, entry] of Object.entries(TEMPLATES)) {
    if (!entry.previewData) {
      console.warn(`skip (no previewData): ${name}`);
      continue;
    }
    const html = await render(React.createElement(entry.component, entry.previewData));
    const subject =
      typeof entry.subject === "function" ? entry.subject(entry.previewData) : entry.subject;
    const file = `${name}.html`;
    writeFileSync(join(OUT, file), html, "utf8");
    items.push({
      id: name,
      group: "Transactional",
      label: entry.displayName ?? name,
      subject,
      file,
    });
    console.log(`✓ ${name}`);
  }

  for (const [name, { component, data }] of Object.entries(AUTH_TEMPLATES)) {
    const html = await render(React.createElement(component, data));
    const file = `auth-${name}.html`;
    writeFileSync(join(OUT, file), html, "utf8");
    const subjects: Record<string, string> = {
      signup: "ยืนยันอีเมลของคุณ — So1o",
      invite: "คุณได้รับคำเชิญเข้าร่วม So1o",
      magiclink: "ลิงก์เข้าสู่ระบบ So1o",
      recovery: "รีเซ็ตรหัสผ่าน So1o",
      email_change: "ยืนยันการเปลี่ยนอีเมล — So1o",
      reauthentication: "รหัสยืนยันตัวตนของคุณ — So1o",
    };
    items.push({
      id: `auth-${name}`,
      group: "Auth",
      label: name,
      subject: subjects[name] ?? name,
      file,
    });
    console.log(`✓ auth-${name}`);
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>So1o Email Previews (${items.length})</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #f5f5f4; color: #0f0f0f; }
    header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e7e5e4; padding: 16px 24px; }
    header h1 { margin: 0 0 4px; font-size: 20px; }
    header p { margin: 0; color: #78716c; font-size: 13px; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    nav a { font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #fff7ed; color: #c2410c; text-decoration: none; border: 1px solid #fed7aa; }
    nav a:hover { background: #ffedd5; }
    main { max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; }
    section { margin-bottom: 40px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #a8a29e; margin: 0 0 16px; }
    .card { background: #fff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.04); }
    .card-head { padding: 14px 18px; border-bottom: 1px solid #f5f5f4; }
    .card-head strong { display: block; font-size: 15px; }
    .card-head span { font-size: 12px; color: #78716c; }
    iframe { width: 100%; border: 0; display: block; min-height: 520px; background: #fafaf9; }
    .open { display: inline-block; margin: 8px 18px 14px; font-size: 12px; color: #ea580c; }
  </style>
</head>
<body>
  <header>
    <h1>So1o Email Previews</h1>
    <p>${items.length} templates — generated ${new Date().toLocaleString("th-TH")}</p>
    <nav>
      ${items.map((i) => `<a href="#${i.id}">${i.label}</a>`).join("")}
    </nav>
  </header>
  <main>
    ${["Transactional", "Auth"]
      .map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return "";
        return `<section><h2>${group}</h2>${groupItems
          .map(
            (i) => `<article class="card" id="${i.id}">
              <div class="card-head"><strong>${i.label}</strong><span>${i.subject}</span></div>
              <iframe src="${i.file}" loading="lazy" onload="this.style.height=(this.contentWindow.document.body.scrollHeight+24)+'px'"></iframe>
              <a class="open" href="${i.file}" target="_blank" rel="noopener">เปิดเต็มหน้าจอ ↗</a>
            </article>`,
          )
          .join("")}</section>`;
      })
      .join("")}
  </main>
</body>
</html>`;

  writeFileSync(join(OUT, "index.html"), indexHtml, "utf8");
  console.log(`\n→ ${join(OUT, "index.html")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

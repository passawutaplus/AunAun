import * as React from "react";
import { render } from "@react-email/components";
import { RecoveryEmail } from "../src/lib/email/anthem-vendor/templates/recovery.tsx";

const el = React.createElement(RecoveryEmail, {
  siteName: "Aplus1",
  confirmationUrl:
    "https://zkflkpbmbozrchqncpzi.supabase.co/auth/v1/verify?token=abc&type=recovery&redirect_to=https%3A%2F%2Faplus1.app%2Fauth%2Fcallback",
});

const html = await render(el);
console.log("length", html.length);
console.log("has streaming markers", /<!--\$/.test(html));
console.log("has button text", html.includes("ตั้งรหัสผ่านใหม่"));
const idx = html.indexOf("ตั้งรหัสผ่านใหม่");
console.log("button context", html.slice(Math.max(0, idx - 150), idx + 150));
console.log("preview hidden count", (html.match(/display:none/g) || []).length);
await import("node:fs").then((fs) => fs.writeFileSync(".tmp-recovery-email.html", html));
console.log("wrote .tmp-recovery-email.html");

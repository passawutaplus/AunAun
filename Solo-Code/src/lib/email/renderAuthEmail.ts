import * as React from "react";
import { render } from "@react-email/components";
import type { AuthEmailBrand } from "@/lib/email/authBrand";

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** React 19 / @react-email streaming markers and bloated preview break Gmail rendering. */
export function sanitizeAuthEmailHtml(html: string): string {
  return html
    .replace(/<!--\$-->/g, "")
    .replace(/<!--\/\$-->/g, "")
    .replace(/<!--html-->/g, "")
    .replace(/<!--head-->/g, "")
    .replace(/<!--body-->/g, "")
    .replace(
      /<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"[\s\S]*?<\/div>/i,
      "",
    )
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function buildAuthEmailFallbackHtml(opts: {
  brand: AuthEmailBrand;
  siteName: string;
  confirmationUrl: string;
  title: string;
  body: string;
  buttonLabel: string;
}): string {
  const accent = opts.brand === "anthem" ? "#FF4F18" : "#FF5F05";
  const safeUrl = opts.confirmationUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="th">
  <body style="margin:0;padding:24px;font-family:'IBM Plex Sans Thai',Arial,sans-serif;background:#ffffff;color:#141517;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #E8E6E3;border-radius:12px;padding:28px 32px;">
      <h1 style="margin:0 0 16px;font-size:22px;">${opts.title}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4A4A4A;">${opts.body}</p>
      <p style="margin:0 0 24px;">
        <a href="${safeUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:8px;">
          ${opts.buttonLabel}
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#9CA3AF;">${opts.siteName}</p>
    </div>
  </body>
</html>`;
}

export async function renderAuthEmailContent(
  element: React.ReactElement,
  fallbackHtml: string,
): Promise<{ html: string; text: string }> {
  let html = "";
  try {
    html = await render(element);
  } catch (error) {
    console.error("Auth email render failed", { error });
  }

  if (!html?.trim() || html.length < 200) {
    console.warn("Auth email render empty/short, using fallback HTML", {
      length: html?.length ?? 0,
    });
    html = fallbackHtml;
  } else {
    html = sanitizeAuthEmailHtml(html);
    if (!html.includes("href=") || html.length < 200 || /<!--\$/.test(html)) {
      console.warn("Auth email HTML still unsafe for clients, using fallback", {
        length: html.length,
      });
      html = fallbackHtml;
    }
  }

  let text = "";
  try {
    text = await render(element, { plainText: true });
  } catch (error) {
    console.warn("Auth email plain-text render failed", { error });
  }

  if (!text?.trim()) {
    text = stripHtmlToText(html);
  }

  return { html, text };
}
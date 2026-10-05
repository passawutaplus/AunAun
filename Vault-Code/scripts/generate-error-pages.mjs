import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "outputs", "a-plus-vault");
const template = await readFile(join(root, "error-page.template.html"), "utf8");

// action kinds: home (coral → Vault), discover, reload, back
const pages = [
  { code: "400", title: "400 Bad Request", eyebrow: "Bad request", headline: "Something slipped.", message: "That link or action did not go through. Head back to Vault and try again.", th: "ลิงก์หรือคำสั่งนี้ไม่สำเร็จ กลับไปที่ Vault แล้วลองอีกครั้งนะ", photo: "phone-coffee", sticker: "Bad request", actions: ["home", "back"] },
  { code: "401", title: "401 Sign in required", eyebrow: "Sign in required", headline: "Sign in to see this.", message: "This page belongs to a private Vault. Log in with the account that owns it.", th: "หน้านี้เป็นของ Vault ส่วนตัว เข้าสู่ระบบด้วยบัญชีเจ้าของก่อนนะ", photo: "swatches-tablet", sticker: "Private by default", actions: ["home", "discover"] },
  { code: "403", title: "403 Forbidden", eyebrow: "No access", headline: "This one is private.", message: "This page is not open to this account. If someone shared it with you, ask them to send the link again.", th: "หน้านี้ยังไม่เปิดให้บัญชีนี้ ถ้ามีคนแชร์ให้ ลองขอลิงก์ใหม่นะ", photo: "studio-desk", sticker: "Private by default", actions: ["home", "back"] },
  { code: "404", title: "404 Not Found", eyebrow: "Page not found", headline: "This page wandered off.", message: "It may have moved or expired. Try Discover, or head back to My Vault.", th: "หน้านี้อาจถูกย้ายหรือหมดอายุ ลองไปดู Discover หรือกลับไปที่ My Vault นะ", photo: "train-phone", sticker: "Not found", actions: ["home", "discover"] },
  { code: "429", title: "429 Too Many Requests", eyebrow: "Slow down", headline: "A little too fast.", message: "That was a lot at once. Give it a moment and try again.", th: "เร็วไปนิดนึง รอสักครู่แล้วลองอีกครั้งนะ", photo: "desk-laptop", sticker: "Try again shortly", actions: ["reload", "home"] },
  { code: "500", title: "500 Server Error", eyebrow: "Server error", headline: "Something slipped.", message: "Something slipped on our side. Give it a moment and try again.", th: "มีบางอย่างสะดุด รอสักครู่แล้วลองใหม่อีกครั้งนะ", photo: "studio-desk", sticker: "Try again shortly", actions: ["reload", "home"] },
  { code: "503", title: "503 Unavailable", eyebrow: "Back soon", headline: "We'll be right back.", message: "A+ Vault is resting for a moment. Try again in a minute.", th: "ระบบพักสักครู่ ลองใหม่ในอีกหนึ่งนาทีนะ", photo: "phone-coffee", sticker: "Back soon", actions: ["reload", "home"] },
];

const actionHtml = (kind, { homeHref }) => ({
  home: `<a class="btn btn-coral" href="${homeHref}">Back to Vault</a>`,
  discover: `<a class="btn btn-ghost" href="/discover">Browse Discover</a>`,
  reload: `<button class="btn btn-coral" type="button" data-reload>Try again</button>`,
  back: `<a class="btn btn-ghost" href="${homeHref}" data-back>Go back</a>`,
}[kind]);

const codeSpans = code => [...code].map(c => `<span>${c}</span>`).join("");

function fill(tpl, page, { homeHref, legalHref }) {
  return tpl
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{CODE}}", page.code)
    .replaceAll("{{CODE_SPANS}}", codeSpans(page.code))
    .replaceAll("{{EYEBROW}}", page.eyebrow)
    .replaceAll("{{HEADLINE}}", page.headline)
    .replaceAll("{{MESSAGE}}", page.message)
    .replaceAll("{{MESSAGE_TH}}", page.th)
    .replaceAll("{{PHOTO}}", page.photo)
    .replaceAll("{{STICKER}}", page.sticker)
    .replaceAll("{{ACTIONS}}", page.actions.map(kind => actionHtml(kind, { homeHref })).join(""))
    .replaceAll("{{HOME_HREF}}", homeHref)
    .replaceAll("{{LEGAL_HREF}}", legalHref);
}

export const ERROR_PAGE_CODES = pages.map(page => page.code);

export async function writeErrorPages(distRoot, options = {}) {
  const homeHref = options.homeHref || "./vault.html";
  const legalHref = options.legalHref || "./legal.html";
  await mkdir(distRoot, { recursive: true });
  for (const page of pages) {
    await writeFile(join(distRoot, `${page.code}.html`), fill(template, page, { homeHref, legalHref }));
  }
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  await writeErrorPages(root, { homeHref: "./index.html", legalHref: "./legal.html" });
  console.log("Wrote source error pages.");
}

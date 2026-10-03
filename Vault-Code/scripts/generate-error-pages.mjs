import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "outputs", "a-plus-vault");
const template = await readFile(join(root, "error-page.template.html"), "utf8");

// action kinds: home (coral → Vault), discover, reload, back
const pages = [
  { code: "400", title: "400 Bad Request", eyebrow: "Bad request", headline: "That didn't look right.", message: "Something about that link or action wasn't valid. Head back to Vault and try again.", th: "ลิงก์หรือคำสั่งนี้ไม่ถูกต้อง กลับไปที่ Vault แล้วลองใหม่อีกครั้ง", photo: "phone-coffee", sticker: "Bad request", actions: ["home", "back"] },
  { code: "401", title: "401 Sign in required", eyebrow: "Sign in required", headline: "Sign in to see this.", message: "This page belongs to a private Vault. Sign in with the account that owns it.", th: "หน้านี้เป็นของ Vault ส่วนตัว เข้าสู่ระบบด้วยบัญชีเจ้าของก่อนนะ", photo: "swatches-tablet", sticker: "Private by default", actions: ["home", "discover"] },
  { code: "403", title: "403 Forbidden", eyebrow: "No access", headline: "This one is private.", message: "You don't have access to this page. If someone shared it with you, ask them to send the link again.", th: "คุณไม่มีสิทธิ์เข้าหน้านี้ ถ้าเพื่อนแชร์ให้ ลองขอลิงก์ใหม่", photo: "studio-desk", sticker: "Private by default", actions: ["home", "back"] },
  { code: "404", title: "404 Not Found", eyebrow: "Page not found", headline: "This page wandered off.", message: "It may have moved, expired, or never existed in your vault. Your saved references are safe.", th: "หน้านี้อาจถูกย้าย หมดอายุ หรือไม่เคยมีอยู่ ของที่เก็บไว้ยังอยู่ครบ", photo: "train-phone", sticker: "Not found", actions: ["home", "discover"] },
  { code: "429", title: "429 Too Many Requests", eyebrow: "Slow down", headline: "Easy there, speedy.", message: "Too many requests in a short time. Wait a moment, then try again.", th: "ส่งคำขอถี่เกินไป รอสักครู่แล้วลองใหม่", photo: "desk-laptop", sticker: "Try again shortly", actions: ["reload", "home"] },
  { code: "500", title: "500 Server Error", eyebrow: "Server error", headline: "Something went wrong.", message: "The server hit a snag. Your references are safe. Wait a moment, then try again.", th: "เซิร์ฟเวอร์สะดุด ของที่เก็บไว้ปลอดภัย รอสักครู่แล้วลองใหม่", photo: "studio-desk", sticker: "We're on it", actions: ["reload", "home"] },
  { code: "503", title: "503 Unavailable", eyebrow: "Back soon", headline: "We'll be right back.", message: "A+ Vault is briefly unavailable. Try again in a minute.", th: "ระบบหยุดชั่วคราว ลองใหม่ในอีกสักครู่", photo: "phone-coffee", sticker: "Back soon", actions: ["reload", "home"] },
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

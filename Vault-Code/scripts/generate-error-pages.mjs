import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "outputs", "a-plus-vault");
const template = await readFile(join(root, "error-page.template.html"), "utf8");

const pages = [
  {
    code: "400",
    file: "400.html",
    title: "400 Bad Request",
    headline: "Bad request.",
    message: "Something about that link or action was not valid. Head back to Vault and try again.",
  },
  {
    code: "404",
    file: "404.html",
    title: "404 Not Found",
    headline: "Page not found.",
    message: "This page may have moved, expired, or never existed in your vault.",
  },
  {
    code: "500",
    file: "500.html",
    title: "500 Server Error",
    headline: "Something went wrong.",
    message: "The server hit a snag. Wait a moment, then open your library again.",
  },
];

function fill(tpl, page, { cssHref, homeHref, legalHref }) {
  return tpl
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{CODE}}", page.code)
    .replaceAll("{{HEADLINE}}", page.headline)
    .replaceAll("{{MESSAGE}}", page.message)
    .replaceAll("{{CSS_HREF}}", cssHref)
    .replaceAll("{{HOME_HREF}}", homeHref)
    .replaceAll("{{LEGAL_HREF}}", legalHref);
}

export async function writeErrorPages(distRoot, options = {}) {
  const cssHref = options.cssHref || "./styles.css";
  const homeHref = options.homeHref || "./vault.html";
  const legalHref = options.legalHref || "./legal.html";
  await mkdir(distRoot, { recursive: true });
  for (const page of pages) {
    const html = fill(template, page, { cssHref, homeHref, legalHref });
    await writeFile(join(distRoot, page.file), html);
  }
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  await writeErrorPages(root, {
    cssHref: "./styles.css",
    homeHref: "./index.html",
    legalHref: "./legal.html",
  });
  console.log("Wrote source error pages.");
}

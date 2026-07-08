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
    headline: "That request got twisted.",
    message: "Something in the ask was off-shape. Try again from Vault, or head back and continue collecting.",
  },
  {
    code: "404",
    file: "404.html",
    title: "404 Not Found",
    headline: "This reference went missing.",
    message: "The page drifted out of the vault. It may have moved, expired, or never existed here.",
  },
  {
    code: "500",
    file: "500.html",
    title: "500 Server Error",
    headline: "The vault overheated.",
    message: "A server spark got too loud. Give it a moment, then return to your library.",
  },
];

function fill(tpl, page, { cssHref, homeHref }) {
  return tpl
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{CODE}}", page.code)
    .replaceAll("{{HEADLINE}}", page.headline)
    .replaceAll("{{MESSAGE}}", page.message)
    .replaceAll("{{CSS_HREF}}", cssHref)
    .replaceAll("{{HOME_HREF}}", homeHref);
}

export async function writeErrorPages(distRoot, options = {}) {
  const cssHref = options.cssHref || "./styles.css";
  const homeHref = options.homeHref || "./vault.html";
  await mkdir(distRoot, { recursive: true });
  for (const page of pages) {
    const html = fill(template, page, { cssHref, homeHref });
    await writeFile(join(distRoot, page.file), html);
  }
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  await writeErrorPages(root, { cssHref: "./styles.css", homeHref: "./index.html" });
  console.log("Wrote source error pages.");
}

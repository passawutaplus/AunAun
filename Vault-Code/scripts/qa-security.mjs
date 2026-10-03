// Security + PWA guards. Imported by qa.mjs (npm run check); also runnable alone: node scripts/qa-security.mjs
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const APP = "outputs/a-plus-vault";
// Legacy demo shell has inline code; vercel.json redirects /demo and /demo.html to /vault.
const INLINE_SCRIPT_EXEMPT = new Set([`${APP}/demo.html`]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function guardHeaders() {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  const rule = (config.headers || []).find(h => h.source === "/(.*)");
  assert(rule, "vercel.json needs a global headers rule (source /(.*)).");
  const get = key => (rule.headers.find(h => h.key.toLowerCase() === key.toLowerCase()) || {}).value || "";
  const csp = get("Content-Security-Policy");
  assert(csp, "Missing Content-Security-Policy header.");
  const script = (csp.match(/(?:^|;)\s*script-src([^;]*)/) || [])[1] || "";
  assert(/'self'/.test(script) && !/unsafe-inline|unsafe-eval|\*/.test(script), "CSP script-src must be 'self' only (no unsafe-inline/eval/wildcards).");
  for (const needle of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
    assert(csp.includes(needle), `CSP must include ${needle}.`);
  }
  assert(/max-age=\d{7,}/.test(get("Strict-Transport-Security")), "HSTS header missing or too short.");
  assert(get("X-Content-Type-Options").toLowerCase() === "nosniff", "X-Content-Type-Options: nosniff missing.");
  assert(get("Referrer-Policy"), "Referrer-Policy missing.");
  assert(get("Permissions-Policy"), "Permissions-Policy missing.");
  // With cleanUrls a rewrite to /vault.html 404s on Vercel (it clashes with dist/vault/index.html); target /vault instead.
  const shell = (config.rewrites || []).filter(r => /^\/(discover|moodboards)/.test(r.source));
  assert(shell.length && shell.every(r => r.destination === "/vault"), "App-shell rewrites (/discover, /moodboards) must point to /vault.");
  const sw = (config.headers || []).find(h => h.source === "/sw.js");
  assert(sw && /max-age=0/.test(sw.headers.map(h => h.value).join(" ")), "/sw.js must be served with Cache-Control max-age=0.");
}

async function guardNoInlineCode() {
  const pages = spawnSync("git", ["ls-files", `${APP}/*.html`], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  for (const file of pages) {
    if (INLINE_SCRIPT_EXEMPT.has(file)) continue;
    const html = await readFile(file, "utf8");
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)].filter(m => !/type=["']application\/(ld\+)?json["']/i.test(m[0]));
    assert(!inline.length, `${file}: inline <script> blocks are blocked by the CSP; move the code to a .js file.`);
    assert(!/<[a-z][^>]*\son(click|load|error|submit|change|input|mouse\w+)\s*=/i.test(html), `${file}: inline on*= handlers are blocked by the CSP.`);
  }
}

async function guardPwa() {
  for (const file of ["sw.js", "offline.html", "offline.js", "manifest.webmanifest", "marketing.css", "marketing.js", "welcome.js", "extension.js", "modules/pwa.js", ".well-known/security.txt"]) {
    await access(`${APP}/${file}`).catch(() => assert(false, `Missing ${APP}/${file}.`));
  }
  const manifest = JSON.parse(await readFile(`${APP}/manifest.webmanifest`, "utf8"));
  assert(manifest.id && manifest.start_url && manifest.display === "standalone", "Manifest needs id, start_url and display: standalone.");
  const purposes = new Set();
  for (const icon of manifest.icons || []) {
    await access(`${APP}${icon.src}`).catch(() => assert(false, `Manifest icon missing on disk: ${icon.src}`));
    purposes.add(`${icon.sizes}:${icon.purpose || "any"}`);
  }
  for (const need of ["192x192:any", "512x512:any", "512x512:maskable"]) assert(purposes.has(need), `Manifest needs an icon ${need}.`);
  assert(/const BUILD = "dev";/.test(await readFile(`${APP}/sw.js`, "utf8")), 'sw.js must keep the `const BUILD = "dev";` placeholder that build.mjs stamps.');
}

async function guardSecrets() {
  const files = spawnSync("git", ["ls-files", "-z", "."], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\0").filter(Boolean);
  const envFiles = files.filter(f => /(^|\/)\.env(\.|$)/.test(f) && !/\.env\.(example|sample|template)$/.test(f));
  assert(!envFiles.length, `Tracked env file(s): ${envFiles.join(", ")}`);
  const patterns = [
    [/sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/, "Anthropic API key"],
    [/sb_secret_[A-Za-z0-9_-]{16,}/, "Supabase secret key"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/\bsk_live_[A-Za-z0-9]{16,}/, "live payment key"],
  ];
  const textFile = /\.(js|mjs|cjs|ts|tsx|json|md|html|css|sql|txt|sh|yml|yaml|env|example|webmanifest)$/i;
  for (const file of files) {
    if (!textFile.test(file) || /package-lock\.json$/.test(file)) continue;
    let text;
    try { text = await readFile(file, "utf8"); } catch { continue; }
    for (const [re, label] of patterns) assert(!re.test(text), `${file}: looks like a committed ${label}. Remove it and rotate the key.`);
    for (const jwt of text.match(/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g) || []) {
      let role = "";
      try { role = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")).role; } catch {}
      assert(role !== "service_role", `${file}: contains a service_role JWT. Remove it and rotate the key.`);
    }
  }
}

export async function runSecurityGuards() {
  await guardHeaders();
  await guardNoInlineCode();
  await guardPwa();
  await guardSecrets();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSecurityGuards().then(() => console.log("Security + PWA guards passed."), error => { console.error(error.message); process.exit(1); });
}

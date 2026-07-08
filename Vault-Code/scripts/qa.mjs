import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const requiredFiles = [
  "outputs/a-plus-vault/index.html",
  "outputs/a-plus-vault/legal.html",
  "outputs/a-plus-vault/app.js",
  "outputs/a-plus-vault/modules/core.js",
  "outputs/a-plus-vault/modules/supabase-adapter.js",
  "outputs/a-plus-vault/modules/utils.js",
  "outputs/a-plus-vault/modules/project-workspace.js",
  "outputs/a-plus-vault/modules/sidebar-dnd.js",
  "outputs/a-plus-vault/modules/user-dashboard.js",
  "outputs/a-plus-vault/demo.html",
  "outputs/a-plus-vault/supabase-config.js",
  "outputs/a-plus-vault/local-server.cjs",
  "outputs/a-plus-vault/assets/fonts/Agrandir-Wide-Light.woff2",
  "outputs/a-plus-vault/docs/legal-alpha-compliance-plan.md",
  "vault-extension/manifest.json",
  "vault-extension/background.js",
  "vault-extension/popup.js",
  "vault-extension/content.js",
  "vault-extension/PUBLIC_RELEASE_CHECKLIST.md",
  "vault-extension/PRIVACY.md",
  "lib/vault-api-auth.mjs",
  "scripts/smoke-public.sh",
  "scripts/prod-api-smoke.mjs",
  "scripts/generate-seo.mjs",
  "scripts/sitemap-lib.mjs",
];

const syntaxFiles = [
  "outputs/a-plus-vault/app.js",
  "outputs/a-plus-vault/modules/core.js",
  "outputs/a-plus-vault/modules/supabase-adapter.js",
  "outputs/a-plus-vault/modules/utils.js",
  "outputs/a-plus-vault/modules/project-workspace.js",
  "outputs/a-plus-vault/modules/sidebar-dnd.js",
  "outputs/a-plus-vault/modules/user-dashboard.js",
  "outputs/a-plus-vault/local-server.cjs",
  "vault-extension/background.js",
  "vault-extension/popup.js",
  "vault-extension/content.js",
];

for (const file of requiredFiles) {
  await access(file);
}

for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

await runStaticProductGuards();
await runLocalServerSmoke();

const grep = spawnSync(
  process.platform === "win32" ? "powershell.exe" : "sh",
  process.platform === "win32"
    ? ["-NoProfile", "-Command", "rg -n \"\\b(prompt|confirm|alert)\\s*\\(\" outputs\\a-plus-vault vault-extension"]
    : ["-lc", "rg -n \"\\b(prompt|confirm|alert)\\s*\\(\" outputs/a-plus-vault vault-extension"],
  { encoding: "utf8" }
);

if (grep.status === 0) {
  process.stdout.write(grep.stdout);
  process.stderr.write("Native browser popup API found. Use app dialogs instead.\n");
  process.exit(1);
}

if (grep.status && grep.status > 1) {
  process.stdout.write(grep.stdout || "");
  process.stderr.write(grep.stderr || "Native popup scan failed.\n");
  process.exit(grep.status);
}

console.log("A+ Vault QA checks passed.");

async function runStaticProductGuards() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert(packageJson.scripts?.["test:gate"], "package.json must expose test:gate.");
  assert(packageJson.scripts?.["smoke:public"], "package.json must expose smoke:public.");
  assert(packageJson.scripts?.["deploy:demo"], "package.json must expose deploy:demo.");
  assert(packageJson.scripts?.["deploy:production"], "package.json must expose deploy:production.");
  assert(packageJson.scripts?.["sitemap:gen"], "package.json must expose sitemap:gen.");

  const popupHtml = await readFile("vault-extension/popup.html", "utf8");
  const popupJs = await readFile("vault-extension/popup.js", "utf8");
  const popupCss = await readFile("vault-extension/popup.css", "utf8");
  const backgroundJs = await readFile("vault-extension/background.js", "utf8");
  const contentJs = await readFile("vault-extension/content.js", "utf8");
  const manifestJson = await readFile("vault-extension/manifest.json", "utf8");
  const buildMjs = await readFile("build.mjs", "utf8");
  const vercelJson = await readFile("vercel.json", "utf8");
  const indexHtml = await readFile("outputs/a-plus-vault/index.html", "utf8");
  const legalHtml = await readFile("outputs/a-plus-vault/legal.html", "utf8");
  const appJs = await readFile("outputs/a-plus-vault/app.js", "utf8");
  const appCss = await readFile("outputs/a-plus-vault/styles.css", "utf8");
  const legalPlanMd = await readFile("outputs/a-plus-vault/docs/legal-alpha-compliance-plan.md", "utf8");
  const supabaseAdapterJs = await readFile("outputs/a-plus-vault/modules/supabase-adapter.js", "utf8");
  const supabaseSchemaSql = await readFile("outputs/a-plus-vault/supabase-schema.sql", "utf8");
  const supabaseHardeningSql = await readFile("outputs/a-plus-vault/supabase-alpha-hardening.sql", "utf8");

  assert(!/Keep current page/i.test(popupHtml), "Popup must not show the removed Keep current page action.");
  assert(!/Review this object before keeping/i.test(popupHtml), "Popup must not show the removed review helper copy.");
  assert(/<option value="all">Vault Library<\/option>/.test(popupHtml), "Popup collection default option must be Vault Library.");
  assert(!/id="quickKeywordsInput"/.test(popupHtml), "Popup must not collect manual quick keywords.");
  assert(!/id="visualCategoryInput"/.test(popupHtml), "Popup must not collect manual visual categories.");
  assert(!/Upload to Vault/i.test(popupHtml), "Popup upload must stay in the web app, not the extension panel.");
  assert(!/>Dismiss</i.test(popupHtml), "Popup dismiss action must use an icon-only close button.");
  assert(/class="capture-actions"/.test(popupHtml), "Popup keep/dismiss actions must share a single aligned action row.");
  assert(/class="header-vault-button"/.test(popupHtml), "Popup must expose Open Vault in the header.");
  assert(/id="duplicateHint"/.test(popupHtml), "Popup must show duplicate hints for repeated captures.");
  assert(/collectionInput\.value = capture\.collectionId \|\| "all"/.test(popupJs), "Pending captures must default to Vault Library.");
  assert(/items\.slice\(0, 3\)/.test(popupJs), "Popup recent list must show the latest three captures.");
  assert(/class="recent-item" data-open-recent/.test(popupJs), "Popup recent captures must render as image-only thumb buttons.");
  assert(!/quickTagsFrom\(quickKeywordsInput\.value\)/.test(popupJs), "Popup must let Vault AI Lite infer keywords after saving.");
  assert(/findRecentDuplicate/.test(popupJs), "Popup must warn about duplicate recent captures.");
  assert(/Agrandir-Wide-Light\.woff2/.test(popupCss), "Popup must use the bundled Agrandir Wide Light font.");
  assert(/backdrop-filter: blur\(26px\) saturate\(170%\)/.test(popupCss), "Popup shell must use the liquid glass backdrop treatment.");
  assert(/grid-template-columns: minmax\(0, 1fr\) 56px/.test(popupCss), "Popup keep button must stretch beside a fixed close button.");
  assert(/chrome\.runtime\.getURL\("fonts\/Agrandir-Wide-Light\.woff2"\)/.test(contentJs), "Injected overlay must resolve the bundled Agrandir font through the extension URL.");
  assert(/"fonts\/Agrandir-Wide-Light\.woff2"/.test(manifestJson), "Manifest must expose the bundled font to injected overlay CSS.");
  assert(/const DEFAULT_API_BASE = "https:\/\/aplus-vault\.vercel\.app"/.test(backgroundJs), "Extension default API base must point to production Vault.");
  assert(/\["keep-page", "page", "\+ Keep in Vault"\]/.test(backgroundJs), "Right-click page saving must use + Keep in Vault.");
  assert(/saveViaWebHandoff/.test(backgroundJs) && /#vault-capture=/.test(backgroundJs), "Extension must fall back to web handoff when a static demo has no capture API.");
  assert(/TextEncoder/.test(backgroundJs), "Extension handoff must encode Unicode capture payloads safely.");
  assert(/https:\/\/aplus-vault\.vercel\.app\/\*/.test(manifestJson), "Manifest must allow production Vault URL.");
  assert(/https:\/\/aplus-vault-demo\.vercel\.app\/\*/.test(manifestJson), "Manifest must allow demo Vault URL.");
  assert(/replace\(\/-\/g,"\+"\)\.replace\(\/_\/g,"\/"\)/.test(appJs), "Web app must decode URL-safe Vault handoff payloads.");
  assert(/vault-runtime\.js/.test(indexHtml), "App shell must load vault-runtime.js for deploy target config.");
  assert(/noindex,nofollow/.test(indexHtml), "Alpha app shell must stay noindex by default.");
  assert(/index,follow/.test(legalHtml), "Legal center should be indexable for trust pages.");
  assert(/rel="canonical"/.test(legalHtml), "Legal page must expose canonical URL.");
  await access("outputs/a-plus-vault/robots.txt");
  await access("outputs/a-plus-vault/sitemap.xml");
  await access("outputs/a-plus-vault/llms.txt");
  const robotsTxt = await readFile("outputs/a-plus-vault/robots.txt", "utf8");
  const sitemapXml = await readFile("outputs/a-plus-vault/sitemap.xml", "utf8");
  assert(/Disallow: \/vault/.test(robotsTxt), "robots.txt must disallow /vault.");
  assert(/Sitemap:/.test(robotsTxt), "robots.txt must link sitemap.");
  assert(/<loc>[^<]*\/legal<\/loc>/.test(sitemapXml), "sitemap must include /legal.");
  assert(!/<loc>[^<]*\/vault<\/loc>/.test(sitemapXml), "sitemap must not include /vault.");
  assert(!/<loc>[^<]*\/demo<\/loc>/.test(sitemapXml), "sitemap must not include /demo.");
  assert(/dist\/vault\.html/.test(buildMjs) && /writeErrorPages/.test(buildMjs) && /dist\/vault\/index\.html/.test(buildMjs), "Build must emit Vault fallbacks and art error pages.");
  assert(/404 Not Found/.test(await readFile("dist/404.html", "utf8")) && /500 Server Error/.test(await readFile("dist/500.html", "utf8")) && /400 Bad Request/.test(await readFile("dist/400.html", "utf8")), "Dist must include art error pages for 400/404/500.");
  assert(/theme-veil/.test(appCss) && /to-dark/.test(appCss) && /applyTheme\(/.test(appJs), "Theme switch must fade smoothly with a dimming veil.");
  assert(/"source": "\/vault"/.test(vercelJson) && /"destination": "\/vault\.html"/.test(vercelJson), "Vercel must route /vault to the static Vault fallback.");
  assert(/"source": "\/400"/.test(vercelJson) && /"source": "\/500"/.test(vercelJson), "Vercel must route explicit 400/500 pages.");
  assert(/Legal Center/.test(legalHtml) && /Privacy Notice/.test(legalHtml) && /Copyright & Takedown Policy/.test(legalHtml), "Legal center must include alpha privacy and copyright notices.");
  assert(/Acceptable Use Policy/.test(legalHtml) && /AI Processing Notice/.test(legalHtml) && /Subprocessor List/.test(legalHtml), "Legal center must include AUP, AI, and subprocessors.");
  assert(/legalFooter/.test(appJs) && /legal\.html#privacy/.test(appJs), "Public app must link to legal/privacy pages.");
  assert(/Privacy & Legal/.test(appJs) && /legal\.html#data-rights/.test(appJs), "Profile must link to legal and data rights pages.");
  assert(/data-export-vault/.test(appJs) && /exportVaultData/.test(appJs), "Profile must expose export my data.");
  assert(/data-clear-vault/.test(appJs) && /clearLocalVaultData/.test(appJs), "Profile must expose clear local Vault data.");
  assert(/data-delete-account/.test(appJs) && /openDeleteAccountDialog/.test(appJs), "Profile must expose delete account / request deletion.");
  assert(/settings-page/.test(appJs) && /upload-plus-button/.test(appJs), "Settings page and upload plus button must exist.");
  assert(/header-profile-button/.test(appJs) && /data-avatar-upload/.test(appJs) && /avatarUrl/.test(appJs), "Header profile button and avatar upload must exist.");
  assert(!/sidebarStorageInline/.test(appJs) && !/sidebarFooter\(\)/.test(appJs), "Sidebar must not keep inline storage/profile footer.");
  assert(/sidebar-upload-button/.test(appJs) && /data-vault-page-drop/.test(appJs) && /uploadImageFiles/.test(appJs), "Sidebar upload button and Vault page drag-drop upload must exist.");
  assert(/settingsOverviewMarkup/.test(appJs) && /settings-overview-card/.test(await readFile("outputs/a-plus-vault/modules/user-dashboard.js", "utf8")), "Settings must include user overview dashboard.");
  assert(/data-unlink-proj-col/.test(appJs) && /unlinkCollectionFromProject/.test(appJs), "Project page must unlink collections without deleting them.");
  assert(/data-unlink-proj-board/.test(appJs) && /unlinkBoardFromProject/.test(appJs), "Project page must remove moodboards from project scope.");
  assert(/project-collection-picker/.test(appJs) && /project-moodboard-picker/.test(appJs), "Project add dialogs must support picker forms.");
  assert(/data-dropproject/.test(appJs) && /modules\/sidebar-dnd\.js/.test(appJs), "Sidebar must support dragging collections onto projects.");
  assert(/metadata\.collectionIds/.test(supabaseAdapterJs), "Supabase adapter must sync project collection links in metadata.");
  await access("api/vault/health.js");
  await access("api/vault/capture.js");
  await access("api/vault/capture-file.js");
  await access("api/vault/captures.js");
  assert(/data-copy-extension-token/.test(appJs) && /getVaultApiToken/.test(appJs), "Profile must expose extension sync token controls.");
  assert(/Private Alpha Demo Guide/.test(await readFile("outputs/a-plus-vault/demo.html", "utf8")), "Demo guide page must exist.");
  assert(/mode: 'supabase-live'/.test(await readFile("outputs/a-plus-vault/supabase-config.js", "utf8")), "Production demo should enable supabase-live mode.");
  assert(!/aplus1\.app/.test(manifestJson), "Extension manifest should not request unrelated host permissions.");
  assert(/Privacy Disclosure/.test(await readFile("vault-extension/PRIVACY.md", "utf8")), "Extension privacy disclosure must exist.");
  assert(/Product Trust Rules/.test(legalPlanMd) && /P0 - Before Alpha/.test(legalPlanMd), "Compliance plan must preserve launch-stage legal gates.");
  assert(/consumeAuthCallback/.test(supabaseAdapterJs), "Supabase adapter must consume OAuth callbacks.");
  assert(/signUpWithPassword/.test(supabaseAdapterJs), "Supabase adapter must support email/password signup.");
  assert(/vault_collection_items/.test(supabaseAdapterJs), "Supabase adapter must sync item collection memberships.");
  assert(/saveProjects/.test(await readFile("outputs/a-plus-vault/modules/supabase-adapter.js", "utf8")), "Supabase adapter must sync projects to remote.");
  assert(/vault-user-/.test(await readFile("outputs/a-plus-vault/app.js", "utf8")), "App must bind extension token to signed-in user.");
  assert(/data-auth-action='signup'/.test(appJs), "Login screen must expose a create account action.");
  assert(/Quick keywords/.test(appJs) && /Visual category/.test(appJs), "Save modal must include quick metadata fields.");
  assert(/findDuplicateItem/.test(appJs), "Web save flow must warn about duplicate exact sources.");
  assert(/assets\/fonts\/Agrandir-Wide-Light\.woff2/.test(appCss), "Web app must use the bundled Agrandir Wide Light font.");
  assert(/for all to authenticated/.test(supabaseSchemaSql), "Supabase RLS policies must target authenticated users.");
  assert(/video\/mp4/.test(supabaseHardeningSql) && /video\/webm/.test(supabaseHardeningSql), "Supabase hardening must allow alpha video mime types.");
}

async function runLocalServerSmoke() {
  const port = 5188;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "aplus-vault-qa-"));
  const child = spawn(process.execPath, ["outputs/a-plus-vault/local-server.cjs"], {
    env: {
      ...process.env,
      VAULT_PORT: String(port),
      VAULT_DATA_DIR: tempDir
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", chunk => { output += chunk.toString(); });
  child.stderr.on("data", chunk => { output += chunk.toString(); });

  try {
    await waitForServer(port, output);

    const health = await requestJson(port, "GET", "/api/vault/health");
    assert(health.status === 200 && health.body.success && health.body.service === "a-plus-vault-local", "Health endpoint must confirm the local server is ready.");

    const empty = await requestJson(port, "GET", "/api/vault/captures");
    assert(empty.status === 200 && empty.body.success && Array.isArray(empty.body.items), "Capture API GET must return an item list.");

    const imageUrl = "https://example.com/reference.jpg";
    const saved = await requestJson(port, "POST", "/api/vault/capture", {
      headers: { Authorization: "Bearer qa-token" },
      body: {
        type: "image",
        title: "QA image reference",
        sourceUrl: imageUrl,
        assetUrl: imageUrl,
        previewUrl: imageUrl,
        quickKeywords: "qa, material",
        visualCategory: "product",
        collectionId: null,
        captureContext: {
          method: "extension_image",
          pageTitle: "QA source page",
          pageUrl: "https://example.com/source",
          imageUrl
        }
      }
    });

    assert(saved.status === 200 && saved.body.success, "Capture API POST must save a valid object.");
    assert(saved.body.item.type === "image", "Image capture must stay an image object.");
    assert(saved.body.item.sourceUrl === imageUrl, "Image capture must preserve source URL.");
    assert(saved.body.item.assetUrl === imageUrl, "Image capture must preserve asset URL.");
    assert(saved.body.item.previewUrl === imageUrl, "Image capture must preserve preview URL.");
    assert(saved.body.item.collectionIds.includes("all"), "Capture without a collection must default to Vault Library.");
    assert(saved.body.item.analysis.tags.includes("qa"), "Capture analysis must include quick keywords.");
    assert(saved.body.item.analysis.category === "product", "Capture analysis must include visual category.");

    const duplicate = await requestJson(port, "POST", "/api/vault/capture", {
      headers: { Authorization: "Bearer qa-token" },
      body: {
        type: "image",
        title: "QA duplicate reference",
        sourceUrl: imageUrl,
        assetUrl: imageUrl,
        previewUrl: imageUrl,
        captureContext: { method: "extension_image", imageUrl }
      }
    });

    assert(duplicate.status === 200 && duplicate.body.duplicateOf, "Duplicate capture must return duplicateOf metadata.");

    const list = await requestJson(port, "GET", "/api/vault/captures");
    assert(list.body.items.length === 2, "Saved captures must appear in the capture import queue.");
  } finally {
    child.kill();
    await rm(tempDir, { recursive: true, force: true });
  }
}

function waitForServer(port, output) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await requestJson(port, "GET", "/api/vault/captures");
        if (response.status === 200) return resolve();
      } catch (_) {}

      if (Date.now() - started > 5000) {
        reject(new Error(`Local server did not start for QA.\n${output}`));
        return;
      }

      setTimeout(tick, 100);
    };
    tick();
  });
}

function requestJson(port, method, route, options = {}) {
  const payload = options.body ? JSON.stringify(options.body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: route,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(options.headers || {})
      }
    }, res => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

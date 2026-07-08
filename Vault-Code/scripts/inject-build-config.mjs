#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveVaultSiteUrl } from "./vault-site-urls.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "outputs", "a-plus-vault");
const siteUrl = resolveVaultSiteUrl();
const demoMode = process.env.VAULT_DEMO_MODE === "true";
const deployTarget = process.env.DEPLOY_TARGET || (demoMode ? "demo" : "production");

writeFileSync(
  join(outDir, "vault-runtime.js"),
  `window.APLUS_VAULT_RUNTIME = ${JSON.stringify({
    siteUrl,
    deployTarget,
    demoMode,
  }, null, 2)};\n`,
  "utf8",
);

const legalPath = join(outDir, "legal.html");
let legalHtml = readFileSync(legalPath, "utf8");
legalHtml = legalHtml.replace(
  /<link rel="canonical" href="[^"]*"/,
  `<link rel="canonical" href="${siteUrl}/legal"`,
);
writeFileSync(legalPath, legalHtml, "utf8");

console.log(`Wrote vault-runtime.js (site: ${siteUrl}, target: ${deployTarget})`);

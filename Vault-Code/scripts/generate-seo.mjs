#!/usr/bin/env node
/**
 * Generate robots.txt, sitemap.xml, and llms.txt for A+ Vault static deploy.
 * Set SITE_URL or VAULT_SITE_URL (default https://aplus-vault.vercel.app)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapUrls,
  buildSitemapXml,
} from "./sitemap-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "outputs", "a-plus-vault");
const base = (
  process.env.VAULT_SITE_URL ||
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  "https://aplus-vault.vercel.app"
).replace(/\/$/, "");

writeFileSync(join(outDir, "robots.txt"), buildRobotsTxt(base), "utf8");
writeFileSync(join(outDir, "sitemap.xml"), buildSitemapXml(base), "utf8");
writeFileSync(join(outDir, "llms.txt"), buildLlmsTxt(base), "utf8");

console.log(`Wrote SEO assets to outputs/a-plus-vault/ (base: ${base})`);
console.log(`  sitemap URLs: ${buildSitemapUrls().length}`);
